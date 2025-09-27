const tasks = require("../models/taskModel");
const { db } = require('../src/config/firebase');

exports.createTask = async (req, res) => {
    try {
        const task = req.body;
        task.createdAt = Date.now();
        task.updatedAt = Date.now();
        task.status = 'Unassigned';
        task.archived = false;

        const newTaskRef = db.ref('tasks').push();
        await newTaskRef.set(task);

        res.status(201).json({ id: newTaskRef.key, message: 'Task created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Task
exports.getTask = async (req, res) => {
    try {
        const snapshot = await db.ref(`tasks/${req.params.id}`).once('value');
        if (!snapshot.exists()) return res.status(404).json({ message: 'Task not found' });

        res.status(200).json(snapshot.val());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await db.ref(`tasks/${req.params.id}`).update({
            status,
            updatedAt: Date.now()
        });
        res.status(200).json({ message: 'Task status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Assign task
exports.assignTask = async (req, res) => {
    try {
        const { assigneeId } = req.body;
        await db.ref(`tasks/${req.params.id}`).update({
            assigneeId,
            updatedAt: Date.now()
        });
        res.status(200).json({ message: 'Task assigned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Soft-delete / archive task
exports.archiveTask = async (req, res) => {
    try {
        await db.ref(`tasks/${req.params.id}`).update({
            archived: true,
            updatedAt: Date.now()
        });
        res.status(200).json({ message: 'Task archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};