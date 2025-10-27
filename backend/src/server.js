const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🔧 Starting server...');
console.log('🔧 Environment variables loaded');

// Import individual routers
console.log('🔧 Loading routes...');
const taskRouter = require('./routes/taskRouter');
const authRouter = require('./routes/authRouter');
const fcmRouter = require('./routes/fcmRouter');
const reportsRouter = require('./routes/reportsRouter');
const projectsRouter = require('./routes/projectsRouter');

console.log('✅ Routes loaded successfully');

// Import Firebase configuration (this will initialize Firebase)
console.log('🔧 Initializing Firebase...');
try {
      require('./config/firebase');
      console.log('✅ Firebase initialized successfully');
    // Start the reminder cron job
    require('./controllers/taskReminderJob'); 
    console.log('✅ ReminderJob loaded successfully');
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

// Use individual routers for API routes
app.use('/tasks', taskRouter);
app.use('/projects', projectsRouter);

app.use('/api/auth', authRouter);
app.use('/api/fcm', fcmRouter);
app.use('/api/reports', reportsRouter);

console.log('✅ Routes configured');

// Add this to server.js for quick testing
app.get('/firebase-test', async (req, res) => {
  try {
    const { db } = require('./config/firebase');
    // Try to read from a test collection
    const snapshot = await db.collection('test').get();
    res.json({ success: true, count: snapshot.size });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
