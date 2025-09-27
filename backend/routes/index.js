const express = require('express');
const router = express.Router();

const taskRouter = require('../src/routes/taskRouter');
const authRoutes = require('../src/routes/authRouter'); // adjust path if needed

// Mount routers
router.use('/tasks', taskRouter);
router.use('/api/auth', authRoutes);

module.exports = router;