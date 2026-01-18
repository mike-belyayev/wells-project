require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Database Connection Logic
const initializeDB = () => {
  if (process.env.VERCEL) {
    connectDB().catch(err => {
      console.error('Vercel DB connection error:', err);
    });
  } else {
    connectDB();
  }
};
initializeDB();

// ========== CORS Configuration (Keep for API requests during dev) ==========
app.use((req, res, next) => {
  // Only set CORS headers for API requests in development
  // In production, same origin so no CORS needed
  if (process.env.NODE_ENV === 'development' && req.path.startsWith('/api')) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5174');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/passengers', require('./routes/passengerRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection?.readyState;
  res.json({ 
    status: 'OK',
    dbState: dbStatus,
    dbStatusText: getDbStatusText(dbStatus),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL ? 'true' : 'false'
  });
});

// ========== SERVE REACT APP IN PRODUCTION ==========
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  // Serve static files from React app
  app.use(express.static(path.join(__dirname, '../public')));
  
  // For any non-API route, serve React app
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    }
  });
}

// Helper function for DB status
function getDbStatusText(status) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
    99: 'Unknown'
  };
  return states[status] || states[99];
}

// Error Handlers
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    requestedPath: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
🚀 Wells Fullstack Server
=======================================
📡 Port: ${PORT}
🌐 Mode: ${process.env.NODE_ENV || 'development'}
🔗 API: http://localhost:${PORT}/api
🔧 Health: http://localhost:${PORT}/api/health

📋 Running in ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} mode
${process.env.NODE_ENV === 'production' ? '📦 Serving React app from /public' : '🔧 Development mode - React runs separately'}
=======================================
    `);
  });
}