const tasks = require("../models/taskModel");

// Create a task
exports.createTask = async (req, res) => {
    try {
        const task = req.body;
        task.createdAt = new Date();
        task.updatedAt = new Date();
        task.status = 'Unassigned';
        task.archived = false;

        const docRef = await db.collection('tasks').add(task);
        res.status(201).json({ id: docRef.id, message: 'Task created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};