// server.js
const express = require('express');
const cors = require('cors');
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

console.log('✅ Routes loaded successfully');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase & cron jobs only if NOT testing
if (process.env.NODE_ENV !== 'test') {
    console.log('🔧 Initializing Firebase...');
    try {
        require('./config/firebase');
        console.log('✅ Firebase initialized successfully');

        // Start reminder cron job
        require('./controllers/taskReminderJob');
        console.log('✅ ReminderJob loaded successfully');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        process.exit(1);
    }
}

console.log('🔧 Setting up middleware...');
// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
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

// Only start server if not testing
if (process.env.NODE_ENV !== 'test') {
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
}

module.exports = app;
