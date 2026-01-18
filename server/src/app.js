require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();

// ========== CRITICAL: ADD DEBUG LOGGING ==========
console.log('=== APP STARTING ON VERCEL ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);

// ========== DATABASE CONNECTION (Vercel-compatible) ==========
let dbConnected = false;
let mongooseInstance = null;

const initializeDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set. Database will not connect.');
      return;
    }

    console.log('Attempting MongoDB connection...');
    
    // For Vercel, use serverless connection settings
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    };

    // Only require and use mongoose if MONGODB_URI is present
    mongooseInstance = mongoose;
    
    await mongooseInstance.connect(process.env.MONGODB_URI, options);
    
    dbConnected = true;
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongooseInstance.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      dbConnected = false;
    });
    
    mongooseInstance.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      dbConnected = false;
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Full error:', err);
    // Don't crash the app - allow it to start without DB
    dbConnected = false;
  }
};

// Initialize DB but don't block app startup
initializeDB().catch(err => {
  console.error('DB initialization error:', err);
});

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== CORS CONFIGURATION ==========
app.use((req, res, next) => {
  // For Vercel, allow requests from the same origin (React app is served from same domain)
  const origin = req.headers.origin;
  
  // Allow requests from the same domain and Vercel preview domains
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ========== API ROUTES WITH ERROR HANDLING ==========
// Wrap each route in try-catch to prevent crashes
const loadRoute = (path, routeFile) => {
  try {
    const route = require(routeFile);
    app.use(path, route);
    console.log(`✅ Loaded route: ${path}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to load route ${path}:`, err.message);
    // Create a fallback route that returns error
    app.use(path, (req, res) => {
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        route: path,
        dbConnected,
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
    return false;
  }
};

// Load routes with error handling
loadRoute('/api/users', './routes/userRoutes');
loadRoute('/api/passengers', './routes/passengerRoutes');
loadRoute('/api/trips', './routes/tripRoutes');
loadRoute('/api/sites', './routes/siteRoutes');

// ========== HEALTH CHECK (ALWAYS WORKS - NO DB DEPENDENCY) ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'running',
    dbConnected,
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memory: process.memoryUsage()
  });
});

// Test endpoint (no dependencies)
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    dbConnected,
    timestamp: new Date().toISOString()
  });
});

// ========== SERVE REACT APP ==========
const publicPath = path.join(__dirname, '../public');
const indexHtmlPath = path.join(publicPath, 'index.html');
const hasReactBuild = fs.existsSync(indexHtmlPath);

if (hasReactBuild) {
  console.log('📦 Serving React app from:', publicPath);
  app.use(express.static(publicPath));
  
  // Serve React app for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(indexHtmlPath);
  });
} else {
  console.log('⚠️ React build not found at:', indexHtmlPath);
  console.log('⚠️ Run: npm run build:client to build React app');
  
  // Show a basic info page if React isn't built
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Wells App - Backend Running</title></head>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Wells App - Backend is Running ✅</h1>
          <p>The Express.js API server is working correctly.</p>
          <ul>
            <li><a href="/api/health">Health Check</a> - Basic server status</li>
            <li><a href="/api/test">API Test</a> - Test endpoint</li>
            <li>Database Status: ${dbConnected ? '✅ Connected' : '⚠️ Not connected'}</li>
            <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
            <li>Running on: ${process.env.VERCEL ? 'Vercel' : 'Local'}</li>
          </ul>
          <p><strong>Note:</strong> React frontend needs to be built. Run <code>npm run build:client</code> locally.</p>
        </body>
      </html>
    `);
  });
}

// ========== ERROR HANDLERS ==========
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    availableEndpoints: [
      '/api/health',
      '/api/test',
      '/api/users',
      '/api/passengers',
      '/api/trips',
      '/api/sites'
    ],
    dbConnected
  });
});

app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  if (err.stack) {
    console.error('Stack:', err.stack);
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    dbConnected,
    timestamp: new Date().toISOString()
  });
});

// ========== EXPORT FOR VERCEL (CRITICAL) ==========
console.log('=== APP INITIALIZATION COMPLETE ===');
console.log('Exporting app for Vercel...');

module.exports = app;

// ========== LOCAL DEVELOPMENT SERVER ==========
// Only start a local server if NOT on Vercel and in development
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
🚀 Local Development Server
=======================================
📡 Port: ${PORT}
🌐 Mode: Development
🔗 API: http://localhost:${PORT}/api
🔧 Health: http://localhost:${PORT}/api/health
🧪 Test: http://localhost:${PORT}/api/test
=======================================
    `);
  });
}