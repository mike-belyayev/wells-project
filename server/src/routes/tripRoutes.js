const express = require('express');
const router = express.Router();
const Trip = require('../models/tripModel');
const dbConnect = require('../lib/mongodb'); // Import the connection helper

// Helper function for error responses
const handleError = (res, error, customMessage = 'Server Error') => {
  console.error(`${customMessage}:`, error);
  
  if (error.name === 'CastError' || error.kind === 'ObjectId') {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      message: 'Please provide a valid trip ID'
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

// Helper function to convert any date format to YYYY-MM-DD
const formatTripDate = (dateInput) => {
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // Try to parse as Date object
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // Convert to YYYY-MM-DD string
  return dateObj.toISOString().split('T')[0];
};

// @route   POST /api/trips
// @desc    Create a new trip
router.post('/', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { passengerId, fromOrigin, toDestination, tripDate, confirmed, numberOfPassengers } = req.body;

    // Validate required fields
    if (!passengerId?.trim() || !fromOrigin?.trim() || !toDestination?.trim() || !tripDate || typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'All fields (passengerId, fromOrigin, toDestination, tripDate, confirmed) are required' 
      });
    }

    // Convert tripDate to YYYY-MM-DD format
    let formattedDate;
    try {
      formattedDate = formatTripDate(tripDate);
    } catch (dateError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid trip date format. Use YYYY-MM-DD format or a valid date string' 
      });
    }

    // Build trip data - set numberOfPassengers to null by default
    const tripData = {
      passengerId: passengerId.trim(),
      fromOrigin: fromOrigin.trim(),
      toDestination: toDestination.trim(),
      tripDate: formattedDate,
      confirmed: Boolean(confirmed),
      numberOfPassengers: numberOfPassengers !== undefined && numberOfPassengers !== null ? 
        parseInt(numberOfPassengers) : null // Changed to null by default
    };

    const newTrip = new Trip(tripData);
    const savedTrip = await newTrip.save();
    
    console.log(`New trip created: ${savedTrip._id} for passenger ${passengerId} on date ${formattedDate}`);
    res.status(201).json(savedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to create trip');
  }
});

// @route   GET /api/trips
// @desc    Get all trips
router.get('/', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const trips = await Trip.find()
      .sort({ tripDate: -1, createdAt: -1 }) // Most recent first
      .maxTimeMS(10000);
    
    console.log(`Fetched ${trips.length} trips`);
    res.json(trips);
  } catch (err) {
    handleError(res, err, 'Failed to fetch trips');
  }
});

// @route   GET /api/trips/:id
// @desc    Get trip by ID
router.get('/:id', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const trip = await Trip.findById(req.params.id)
      .maxTimeMS(10000);
    
    if (!trip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }
    
    res.json(trip);
  } catch (err) {
    handleError(res, err, 'Failed to fetch trip');
  }
});

// @route   GET /api/trips/passenger/:passengerId
// @desc    Get trips by passenger ID
router.get('/passenger/:passengerId', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const passengerId = req.params.passengerId;
    
    if (!passengerId?.trim()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Passenger ID is required' 
      });
    }

    const trips = await Trip.find({ passengerId: passengerId.trim() })
      .sort({ tripDate: -1 })
      .maxTimeMS(10000);
    
    if (!trips || trips.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'No trips found for this passenger' 
      });
    }
    
    console.log(`Fetched ${trips.length} trips for passenger ${passengerId}`);
    res.json(trips);
  } catch (err) {
    handleError(res, err, 'Failed to fetch passenger trips');
  }
});

// @route   GET /api/trips/date/:date
// @desc    Get trips by specific date
router.get('/date/:date', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const dateParam = req.params.date;
    
    // Convert input date to YYYY-MM-DD format for consistent querying
    let queryDate;
    try {
      queryDate = formatTripDate(dateParam);
    } catch (dateError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid date format. Use YYYY-MM-DD format' 
      });
    }

    // Query using exact string match since we're storing dates as strings
    const trips = await Trip.find({
      tripDate: queryDate
    })
    .sort({ createdAt: 1 })
    .maxTimeMS(10000);
    
    console.log(`Fetched ${trips.length} trips for date ${queryDate}`);
    res.json(trips);
  } catch (err) {
    handleError(res, err, 'Failed to fetch trips by date');
  }
});

// @route   PUT /api/trips/:id
// @desc    Update trip by ID
router.put('/:id', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { passengerId, fromOrigin, toDestination, tripDate, confirmed, numberOfPassengers } = req.body;

    // Validate required fields
    if (!passengerId?.trim() || !fromOrigin?.trim() || !toDestination?.trim() || !tripDate || typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'All fields (passengerId, fromOrigin, toDestination, tripDate, confirmed) are required' 
      });
    }

    // Convert tripDate to YYYY-MM-DD format
    let formattedDate;
    try {
      formattedDate = formatTripDate(tripDate);
    } catch (dateError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid trip date format. Use YYYY-MM-DD format or a valid date string' 
      });
    }

    const updateData = {
      passengerId: passengerId.trim(),
      fromOrigin: fromOrigin.trim(),
      toDestination: toDestination.trim(),
      tripDate: formattedDate,
      confirmed: Boolean(confirmed),
      numberOfPassengers: numberOfPassengers !== undefined && numberOfPassengers !== null ? 
        parseInt(numberOfPassengers) : null // Changed to null by default
    };

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedTrip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }

    console.log(`Trip updated: ${updatedTrip._id} for date ${formattedDate}`);
    res.json(updatedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to update trip');
  }
});
// @route   PATCH /api/trips/:id/confirm
// @desc    Update trip confirmation status
router.patch('/:id/confirm', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { confirmed } = req.body;

    if (typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Confirmed field is required' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { confirmed: Boolean(confirmed) } },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedTrip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }

    console.log(`Trip ${updatedTrip._id} confirmation set to: ${confirmed}`);
    res.json(updatedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to confirm trip');
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip by ID
router.delete('/:id', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id)
      .maxTimeMS(10000);
    
    if (!deletedTrip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }
    
    console.log(`Trip deleted: ${deletedTrip._id}`);
    res.json({ 
      message: 'Trip deleted successfully',
      tripId: deletedTrip._id 
    });
  } catch (err) {
    handleError(res, err, 'Failed to delete trip');
  }
});

// @route   PATCH /api/trips/:id/passengers/increment
// @desc    Increment number of passengers
router.patch('/:id/passengers/increment', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { numberOfPassengers: 1 },
        $setOnInsert: { numberOfPassengers: 2 } // If field doesn't exist, set to 2
      },
      { 
        new: true, 
        runValidators: true,
        upsert: false,
        maxTimeMS: 10000 
      }
    );

    if (!updatedTrip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }

    console.log(`Incremented passengers for trip ${updatedTrip._id}: ${updatedTrip.numberOfPassengers}`);
    res.json(updatedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to increment passengers');
  }
});

// @route   PATCH /api/trips/:id/passengers/decrement
// @desc    Decrement number of passengers (minimum 1)
router.patch('/:id/passengers/decrement', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    // Use findOneAndUpdate with condition to prevent going below 1
    const updatedTrip = await Trip.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { numberOfPassengers: { $gt: 1 } },
          { numberOfPassengers: { $exists: false } }
        ]
      },
      { 
        $inc: { numberOfPassengers: -1 },
        $setOnInsert: { numberOfPassengers: 1 } // Ensure minimum of 1
      },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedTrip) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Number of passengers cannot be less than 1' 
      });
    }

    console.log(`Decremented passengers for trip ${updatedTrip._id}: ${updatedTrip.numberOfPassengers}`);
    res.json(updatedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to decrement passengers');
  }
});

// @route   PATCH /api/trips/:id/passengers/set
// @desc    Set specific number of passengers
router.patch('/:id/passengers/set', async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection
    
    const { numberOfPassengers } = req.body;

    if (numberOfPassengers === undefined || numberOfPassengers === null) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'numberOfPassengers field is required' 
      });
    }

    const passengerCount = parseInt(numberOfPassengers);
    if (isNaN(passengerCount) || passengerCount < 1) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'numberOfPassengers must be a positive integer' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { numberOfPassengers: passengerCount } },
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 10000 
      }
    );

    if (!updatedTrip) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Trip not found' 
      });
    }

    console.log(`Set passengers for trip ${updatedTrip._id} to: ${passengerCount}`);
    res.json(updatedTrip);
  } catch (err) {
    handleError(res, err, 'Failed to set passengers');
  }
});

module.exports = router;