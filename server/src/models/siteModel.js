const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true
  },
  currentPOB: {
    type: Number,
    required: true
  },
  maximumPOB: {
    type: Number,
    required: true
  },
  pobUpdatedDate: {
    type: Date,  // Use Date type instead of String
    required: true
  }
});

module.exports = mongoose.model('Site', SiteSchema);