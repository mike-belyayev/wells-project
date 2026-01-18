const express = require('express');
const router = express.Router();
const Passenger = require('../models/passengerModel');
const Trip = require('../models/tripModel');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const dbConnect = require('../lib/mongodb'); // Import the connection helpers

// Helper function for error responses
const handleError = (res, error, customMessage = 'Server Error') => {
  console.error(`${customMessage}:`, error);
  
  if (error.name === 'CastError' || error.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  
  if (error.name === 'MongoError' || error.name.includes('Mongo')) {
    return res.status(503).json({ error: 'Database service unavailable' });
  }
  
  res.status(500).json({ error: customMessage });
};

// @route   POST /api/passengers
// @desc    Create a new passenger
router.post('/', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { firstName, lastName, jobRole } = req.body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'First name and last name are required and cannot be empty'
      });
    }

    const newPassenger = new Passenger({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jobRole: jobRole?.trim() || ''
    });

    const savedPassenger = await newPassenger.save();
    
    console.log(`New passenger created: ${savedPassenger.firstName} ${savedPassenger.lastName}`);
    res.status(201).json(savedPassenger);
  } catch (err) {
    handleError(res, err, 'Failed to create passenger');
  }
});

// @route   GET /api/passengers
// @desc    Get all passengers
router.get('/', auth, async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const passengers = await Passenger.find()
      .sort({ firstName: 1, lastName: 1 }) // Sort alphabetically
      .maxTimeMS(10000); // Add query timeout
    
    res.json(passengers);
  } catch (err) {
    handleError(res, err, 'Failed to fetch passengers');
  }
});

// @route   GET /api/passengers/:id
// @desc    Get passenger by ID
router.get('/:id', auth, async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const passenger = await Passenger.findById(req.params.id)
      .maxTimeMS(10000); // Add query timeout
    
    if (!passenger) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Passenger not found' 
      });
    }
    
    res.json(passenger);
  } catch (err) {
    handleError(res, err, 'Failed to fetch passenger');
  }
});

// @route   PUT /api/passengers
// @desc    Update passenger (alternative endpoint that accepts ID in body)
router.put('/', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    // Extract fields from body, including _id
    const { _id, firstName, lastName, jobRole } = req.body;

    // Validate required fields
    if (!_id) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Passenger ID is required' 
      });
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'First name and last name are required and cannot be empty'
      });
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(jobRole !== undefined && { jobRole: jobRole?.trim() || '' })
    };

    const updatedPassenger = await Passenger.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedPassenger) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Passenger not found' 
      });
    }

    console.log(`Passenger updated via /passengers endpoint: ${updatedPassenger.firstName} ${updatedPassenger.lastName}`);
    res.json(updatedPassenger);
  } catch (err) {
    handleError(res, err, 'Failed to update passenger');
  }
});

// @route   PUT /api/passengers/:id
// @desc    Update passenger by ID
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { firstName, lastName, jobRole } = req.body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'First name and last name are required and cannot be empty'
      });
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(jobRole !== undefined && { jobRole: jobRole?.trim() || '' })
    };

    const updatedPassenger = await Passenger.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedPassenger) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Passenger not found' 
      });
    }

    console.log(`Passenger updated: ${updatedPassenger.firstName} ${updatedPassenger.lastName}`);
    res.json(updatedPassenger);
  } catch (err) {
    handleError(res, err, 'Failed to update passenger');
  }
});

// @route   DELETE /api/passengers/:id
// @desc    Delete passenger by ID and all associated trips
router.delete('/:id', [auth, admin], async (req, res) => {
  let session = null;
  
  try {
    await dbConnect(); // Ensure DB connection
    
    const passengerId = req.params.id;
    
    // Use transaction for atomic operation (if using replica set)
    const mongooseConnection = await dbConnect();
    session = await mongooseConnection.startSession();
    
    await session.withTransaction(async () => {
      // First, check if passenger exists
      const passenger = await Passenger.findById(passengerId)
        .session(session)
        .maxTimeMS(10000);
        
      if (!passenger) {
        throw new Error('Passenger not found');
      }

      // Delete all trips associated with this passenger
      const deleteTripsResult = await Trip.deleteMany({ passengerId })
        .session(session)
        .maxTimeMS(10000);
      
      console.log(`Deleted ${deleteTripsResult.deletedCount} trips for passenger ${passengerId}`);

      // Then delete the passenger
      await Passenger.findByIdAndDelete(passengerId)
        .session(session)
        .maxTimeMS(10000);
    });

    // If we get here, transaction was successful
    res.json({ 
      message: 'Passenger and associated trips deleted successfully',
      passengerId: passengerId
    });
    
  } catch (err) {
    console.error('Delete Passenger Error:', err.message);
    
    if (err.message === 'Passenger not found') {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Passenger not found' 
      });
    }
    
    handleError(res, err, 'Failed to delete passenger');
  } finally {
    // End session if it was started
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;