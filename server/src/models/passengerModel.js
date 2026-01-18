const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
    lastName: {
    type: String,
    required: true
  },
  jobRole: {
    type: String
  }
});

module.exports = mongoose.model('Passenger', PassengerSchema);