
const express = require('express');
const cors = require('cors');
// Vercel can also read .env files via its dashboard settings, 
// but dotenv is needed for local development.
require('dotenv').config(); 

console.log('🔧 Starting server...');
console.log('🔧 Environment variables loaded');

// Import routers
console.log('🔧 Loading routes...');
const taskRouter = require('./routes/taskRouter');
const authRouter = require('./routes/authRouter');
const reportsRouter = require('./routes/reportsRouter');
const projectsRouter = require('./routes/projectsRouter');
const categoriesRouter = require('./routes/categoriesRouter');
const notificationRouter = require('./routes/notificationRouter');
const departmentsRouter = require('./routes/departmentsRouter'); 

console.log('✅ Routes loaded successfully');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase & cron jobs
// We must initialize these resources, but we only start the cron job locally.
if (process.env.NODE_ENV !== 'test') {
    console.log('🔧 Initializing Firebase...');
    try {
        require('./config/firebase');
        console.log('✅ Firebase initialized successfully');

        // Start reminder cron job only if running locally (not on Vercel or test)
        // Vercel Serverless Functions should not run scheduled cron jobs;
        // Firebase Cloud Functions or Vercel Cron Jobs service should handle this.
        if (!process.env.VERCEL) {
            require('./controllers/taskReminderJob');
            console.log('✅ ReminderJob loaded successfully');
        } else {
            console.log('ℹ️ CronJob skipped as running on Vercel.');
        }

    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        // Do not exit process on Vercel, just log error and let the app proceed if possible
        if (!process.env.VERCEL) {
            process.exit(1); 
        }
    }
}

console.log('🔧 Setting up middleware...');
// Middleware
// NOTE: For Vercel, your frontend origin will be your Vercel URL (e.g., https://is212-task-management.vercel.app)
// You might need to adjust this to include the Vercel URL in production.
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174',
    // Add your Vercel production URL here or use environment variable
    process.env.FRONTEND_URL,
    // Vercel preview URLs follow pattern: https://*-git-*-yourteam.vercel.app
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin) || process.env.VERCEL) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('✅ Middleware configured');

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'IS212 Task Management API (Running via Vercel Function)',
        status: 'active',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'IS212 Task Management API',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/tasks', taskRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/departments', departmentsRouter);

// Test routes (only in non-production)
if (process.env.NODE_ENV !== 'production') {
    const testEmailRouter = require('../routes/test-email.js');
    app.use('/api/notifications/test', testEmailRouter);
}

// Firebase test endpoint (optional)
app.get('/firebase-test', async (req, res) => {
    try {
        const { db } = require('./config/firebase');
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

console.log('🔧 Ready to start server');

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    // This block ONLY runs locally.
    app.listen(PORT, '0.0.0.0', (err) => {
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
}

module.exports = app;
