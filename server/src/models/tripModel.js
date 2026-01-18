const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  passengerId: {
    type: String,
    required: true
  },
  fromOrigin: {
    type: String,
    required: true
  },
  toDestination: {
    type: String,
    required: true
  },
  tripDate: {
    type: String,
    required: true
  },
  confirmed: {
    type: Boolean,
    required: true
  },
  numberOfPassengers: {
    type: Number,
    min: 1,
    validate: {
      validator: function(value) {
        // Allow null/undefined, or positive integers
        return value === null || value === undefined || (Number.isInteger(value) && value >= 1);
      },
      message: 'Number of passengers must be a positive integer or empty'
    },
    default: null
  }
});

module.exports = mongoose.model('Trip', TripSchema);