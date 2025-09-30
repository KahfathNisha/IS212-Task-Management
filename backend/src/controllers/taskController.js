const { db, admin } = require('../config/firebase');
const taskModel = require('../models/taskModel');

// Create Task
exports.createTask = async (req, res) => {
    try {
        const { dueDate, assigneeId, title } = req.body;

        if (!dueDate) {
            return res.status(400).json({ message: "dueDate is required" });
        }

        const due = new Date(dueDate);
        if (isNaN(due.getTime())) {
            return res.status(400).json({ message: "Invalid dueDate" });
        }

        const task = {
            ...taskModel,
            ...req.body,
            dueDate: admin.firestore.Timestamp.fromDate(due),
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            status: 'Unassigned',
            archived: false
        };
        const docRef = await db.collection('tasks').add(task);
        const reminderOffsets = [1, 3, 7]; // days before due date
        const reminderPromises = reminderOffsets.map(days => {
            const reminderTime = new Date(due.getTime() - days * 24 * 60 * 60 * 1000);
            const reminderId = `${docRef.id}_${assigneeId}_${days}`;
            return db.collection('reminders').doc(reminderId).set({
                taskId: docRef.id,
                userId: assigneeId,
                taskTitle: title,
                dueDate: admin.firestore.Timestamp.fromDate(due),
                reminderTime: admin.firestore.Timestamp.fromDate(reminderTime),
                daysBeforeDue: days, // Add this to track which reminder this is
                sent: false
            });
        });

        await Promise.all(reminderPromises);

        res.status(201).json({ id: docRef.id, message: 'Task created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Task
exports.getTask = async (req, res) => {
    try {
        const doc = await db.collection('tasks').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ message: 'Task not found' });

        res.status(200).json(doc.data());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await db.collection('tasks').doc(req.params.id).update({
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
        await db.collection('tasks').doc(req.params.id).update({
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
        await db.collection('tasks').doc(req.params.id).update({
            archived: true,
            updatedAt: Date.now()
        });
        res.status(200).json({ message: 'Task archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};