const express = require('express');
const router = express.Router();
const Example = require('../models/exampleModel');

// @route   POST /api/example
// @desc    Create an example
router.post('/', async (req, res) => {
  try {
    const newExample = new Example(req.body);
    const example = await newExample.save();
    res.json(example);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/example
// @desc    Get all examples
router.get('/', async (req, res) => {
  try {
    const examples = await Example.find();
    res.json(examples);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;