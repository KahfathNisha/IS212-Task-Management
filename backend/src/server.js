const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🔧 Starting server...');
console.log('🔧 Environment variables loaded');

// Import routes
console.log('🔧 Loading routes...');
const authRoutes = require('./routes/authRoutes');
console.log('✅ Routes loaded successfully');

// Import Firebase configuration (this will initialize Firebase)
console.log('🔧 Initializing Firebase...');
try {
  require('./config/firebase');
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Setting up middleware...');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vue dev server ports
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware configured');

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'IS212 Task Management API',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'IS212 Task Management API',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

console.log('✅ Routes configured');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

console.log('🔧 Starting server on port', PORT);

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  
  console.log(`
  ✅ IS212 Task Management Server Started Successfully!
  📍 Running on: http://localhost:${PORT}
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  📝 API Docs: http://localhost:${PORT}/
  🏥 Health: http://localhost:${PORT}/health
  `);
});