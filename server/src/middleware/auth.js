const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const dbConnect = require('../lib/mongodb');

const auth = async (req, res, next) => {
  try {
    // Ensure database connection
    await dbConnect();
    
    const authHeader = req.header('Authorization');
    
    // More robust header validation
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Authorization header must start with "Bearer "'
      });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is missing after Bearer prefix'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with query timeout
    const user = await User.findById(decoded._id)
      .select('-password -__v') // Exclude sensitive fields
      .maxTimeMS(10000); // Add query timeout
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Attach to request
    req.token = token;
    req.user = user;
    req.userId = user._id;
    
    console.log(`Authenticated user: ${user.email || user._id}`);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.name, err.message);
    
    // More specific error responses
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Malformed JWT token',
        code: 'JWT_INVALID'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please log in again',
        code: 'JWT_EXPIRED'
      });
    }
    
    if (err.name === 'MongooseError' || err.name.includes('Mongo')) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Database connection issue',
        code: 'DB_ERROR'
      });
    }

    // Generic authentication error
    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please authenticate',
      code: 'AUTH_FAILED'
    });
  }
};

// Optional: Create a non-blocking version for optional auth
auth.optional = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      await dbConnect();
      const user = await User.findById(decoded._id)
        .select('-password -__v')
        .maxTimeMS(5000);
      
      if (user) {
        req.user = user;
        req.userId = user._id;
        req.token = token;
      }
    }
  } catch (err) {
    // Silently fail for optional auth
    console.log('Optional auth failed (non-critical):', err.message);
  }
  
  next();
};

module.exports = auth;