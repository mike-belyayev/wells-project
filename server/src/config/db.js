const mongoose = require('mongoose');
require('dotenv').config();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // If we have a cached connection in the same serverless function invocation, use it
  if (cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  // If we don't have a connection promise yet, create one
  if (!cached.promise) {
    const connectionOptions = {
      // Remove unsupported options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Use these modern options instead
      maxIdleTimeMS: 30000,
      minPoolSize: 1,
    };

    console.log('Creating new MongoDB connection...');
    
    cached.promise = mongoose.connect(process.env.MONGODB_URI, connectionOptions)
      .then((mongoose) => {
        console.log('MongoDB Connected successfully to:', mongoose.connection.host);
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        cached.promise = null; // Reset promise on error
        throw error;
      });
  }

  try {
    // Wait for the connection promise to resolve
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // Reset promise on error
    throw error;
  }

  return cached.conn;
}

// Connection event handlers for debugging
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
  cached.conn = null;
  cached.promise = null;
});

// For Vercel, we don't need keep-alive since connections are short-lived
// The connection caching above handles reusing connections within the same function invocation

module.exports = connectDB;