const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const dbConnect = require('../lib/mongodb'); // Import the connection helper

// Helper function for error responses
const handleError = (res, error, customMessage = 'Server Error') => {
  console.error(`${customMessage}:`, error);
  
  if (error.name === 'CastError' || error.kind === 'ObjectId') {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      message: 'Please provide a valid user ID'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      message: error.message 
    });
  }
  
  if (error.name === 'MongoError' || error.name.includes('Mongo')) {
    return res.status(503).json({ 
      error: 'Database service unavailable',
      message: 'Please try again later'
    });
  }
  
  res.status(500).json({ error: customMessage });
};

// @route   POST /api/users/register
// @desc    Register a new user (active immediately)
router.post('/register', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { userName, password, firstName, lastName, homeLocation, isAdmin } = req.body;

    // Validate required fields
    if (!userName?.trim() || !password?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Username and password are required' 
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9\-]+$/.test(userName.trim())) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Username can only contain letters, numbers, and hyphens' 
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ userName: userName.trim() })
      .maxTimeMS(10000);
      
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Username already exists' 
      });
    }

    // Create new user (active immediately)
    const newUser = new User({
      userName: userName.trim(),
      password: password.trim(),
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      homeLocation: homeLocation?.trim() || 'NSC',
      isAdmin: Boolean(isAdmin) || false
    });

    const savedUser = await newUser.save();

    // Return user without password
    const userToReturn = savedUser.toObject();
    delete userToReturn.password;

    console.log(`New user registered: ${userName}`);
    res.status(201).json(userToReturn);
  } catch (err) {
    handleError(res, err, 'Failed to register user');
  }
});

// @route   POST /api/users/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { userName, password } = req.body;

    // Validate required fields
    if (!userName?.trim() || !password?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Username and password are required' 
      });
    }

    // Find user by username including password
    const user = await User.findOne({ userName: userName.trim() })
      .select('+password')
      .maxTimeMS(10000);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid credentials' 
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = await user.generateAuthToken();

    // Return user info (without sensitive data) and token
    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.tokens;

    console.log(`User logged in: ${userName}`);
    res.json({ 
      user: userToReturn,
      token
    });
  } catch (err) {
    handleError(res, err, 'Failed to login user');
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const user = await User.findById(req.user._id)
      .select('-password')
      .maxTimeMS(10000);
      
    if (!user) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Failed to fetch user profile');
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile (including password)
router.put('/me', auth, async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { firstName, lastName, homeLocation, currentPassword, newPassword } = req.body;
    
    // Find the current user with password
    const user = await User.findById(req.user._id)
      .select('+password')
      .maxTimeMS(10000);
      
    if (!user) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }

    // If changing password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Current password is required to set new password' 
        });
      }
      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Current password is incorrect' 
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'New password must be at least 8 characters' 
        });
      }
      
      // Set new password - will be hashed by pre-save middleware
      user.password = newPassword;
    }

    // Update other fields
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName.trim();
    if (lastName !== undefined) updateFields.lastName = lastName.trim();
    if (homeLocation !== undefined) updateFields.homeLocation = homeLocation.trim();

    // Update user with all fields
    Object.assign(user, updateFields);
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.user._id)
      .select('-password')
      .maxTimeMS(10000);
      
    console.log(`User profile updated: ${user.userName}`);
    res.json(updatedUser);
  } catch (err) {
    handleError(res, err, 'Failed to update user profile');
  }
});

// ADMIN ROUTES //

// @route   GET /api/users
// @desc    Get all users (Admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const users = await User.find()
      .select('-password')
      .sort({ userName: 1 })
      .maxTimeMS(10000);
    
    console.log(`Admin fetched ${users.length} users`);
    res.json(users);
  } catch (err) {
    handleError(res, err, 'Failed to fetch users');
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const user = await User.findById(req.params.id)
      .select('-password')
      .maxTimeMS(10000);
      
    if (!user) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Failed to fetch user');
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID (Admin only - can update all fields including password)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { userName, firstName, lastName, isAdmin, homeLocation, password } = req.body;
    
    // Find user
    const user = await User.findById(req.params.id)
      .maxTimeMS(10000);
      
    if (!user) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }

    // Check if username is being changed and if it's available
    if (userName && userName !== user.userName) {
      if (!/^[a-zA-Z0-9\-]+$/.test(userName.trim())) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Username can only contain letters, numbers, and hyphens' 
        });
      }
      
      const existingUser = await User.findOne({ userName: userName.trim() })
        .maxTimeMS(10000);
        
      if (existingUser) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Username already exists' 
        });
      }
      user.userName = userName.trim();
    }

    // Update other fields
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (homeLocation !== undefined) user.homeLocation = homeLocation.trim();
    if (isAdmin !== undefined) user.isAdmin = Boolean(isAdmin);
    
    // Update password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Password must be at least 8 characters' 
        });
      }
      user.password = password;
    }

    // Save the updated user
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.params.id)
      .select('-password')
      .maxTimeMS(10000);
      
    console.log(`Admin updated user: ${updatedUser.userName}`);
    res.json(updatedUser);
  } catch (err) {
    handleError(res, err, 'Failed to update user');
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user by ID (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const deletedUser = await User.findByIdAndDelete(req.params.id)
      .maxTimeMS(10000);
    
    if (!deletedUser) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }
    
    console.log(`Admin deleted user: ${deletedUser.userName}`);
    res.json({ 
      message: 'User deleted successfully',
      userName: deletedUser.userName 
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete user');
  }
});

module.exports = router;