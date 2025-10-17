const { db, admin } = require('../config/firebase');
const taskModel = require('../models/taskModel');

// --- Helper function for Timestamp conversion ---
const formatTimestampToISO = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    // If it's not a Firestore Timestamp, return the original data.
    return timestamp;
};

// Create Task
exports.createTask = async (req, res) => {
    try {
        const { dueDate, assigneeId, title, priority, subtasks, taskOwner } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: "Title is required" });
        }
        
        if (!taskOwner) {
            return res.status(400).json({ message: "Task Owner is required" });
        }

        if (!dueDate) {
            return res.status(400).json({ message: "Due Date is required" });
        }

        if (!priority) {
            return res.status(400).json({ message: "Priority is required" });
        }

        if (subtasks && Array.isArray(subtasks)) {
            for (let i = 0; i < subtasks.length; i++) {
                const subtask = subtasks[i];
                if (!subtask.title || subtask.title.trim() === '') return res.status(400).json({ message: `Subtask ${i + 1}: Title is required` });
                if (!subtask.dueDate) return res.status(400).json({ message: `Subtask ${i + 1}: Due Date is required` });
                if (!subtask.priority) return res.status(400).json({ message: `Subtask ${i + 1}: Priority is required` });
                
                const subDue = new Date(subtask.dueDate);
                if (isNaN(subDue.getTime())) return res.status(400).json({ message: `Subtask ${i + 1}: Invalid due date format` });
                
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (subDue < now) return res.status(400).json({ message: `Subtask ${i + 1}: dueDate cannot be in the past` });
            }
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
            status: req.body.status || 'Unassigned',
            projectId: req.body.projectId || null,
            archived: false
        };

        if (task.recurrence && task.recurrence.enabled) {
            const recurrence = task.recurrence;
            const recurringTaskRef = await db.collection('recurringTasks').add({
                userId: assigneeId,
                taskOwner: task.taskOwner,
                recurrence: recurrence,
                title: task.title,
                description: task.description,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                active: true
            });

            const firstTaskInstance = { ...task, recurringTaskId: recurringTaskRef.id };
            await db.collection('tasks').add(firstTaskInstance);

            let current = new Date(recurrence.startDate || dueDate);
            const end = new Date(recurrence.endDate);
            const interval = recurrence.type === 'custom' ? recurrence.interval : 1;
            let addFn;

            switch (recurrence.type) {
                case 'daily': addFn = date => date.setDate(date.getDate() + 1); break;
                case 'weekly': addFn = date => date.setDate(date.getDate() + 7); break;
                case 'monthly': addFn = date => date.setMonth(date.getMonth() + 1); break;
                case 'custom': addFn = date => date.setDate(date.getDate() + interval); break;
                default: addFn = null;
            }

            if (addFn) {
                addFn(current); // Move to the next recurrence date after the first
                while (current <= end) {
                    let dueDateInstance = new Date(current);
                    if (recurrence.dueOffset && recurrence.dueOffsetUnit) {
                        if (recurrence.dueOffsetUnit === 'days') dueDateInstance.setDate(dueDateInstance.getDate() + recurrence.dueOffset);
                        else if (recurrence.dueOffsetUnit === 'weeks') dueDateInstance.setDate(dueDateInstance.getDate() + recurrence.dueOffset * 7);
                    }
                    const recurringTaskInstance = {
                        ...task,
                        dueDate: admin.firestore.Timestamp.fromDate(dueDateInstance),
                        createdAt: admin.firestore.Timestamp.now(),
                        updatedAt: admin.firestore.Timestamp.now(),
                        recurringTaskId: recurringTaskRef.id
                    };
                    await db.collection('tasks').add(recurringTaskInstance);
                    const next = new Date(current);
                    addFn(next);
                    current = next;
                }
            }
            return res.status(201).json({ id: recurringTaskRef.id, message: 'Recurring task created successfully' });
        }

        const docRef = await db.collection('tasks').add(task);
        res.status(201).json({ id: docRef.id, message: 'Task created successfully' });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get Task
exports.getTask = async (req, res) => {
    try {
        const doc = await db.collection('tasks').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ message: 'Task not found' });
        let taskData = doc.data();
        taskData.dueDate = formatTimestampToISO(taskData.dueDate);
        taskData.createdAt = formatTimestampToISO(taskData.createdAt);
        res.status(200).json(taskData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Tasks
exports.getAllTasks = async (req, res) => {
    try {
        const snapshot = await db.collection('tasks').get();
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dueDate: formatTimestampToISO(data.dueDate),
                createdAt: formatTimestampToISO(data.createdAt),
                updatedAt: formatTimestampToISO(data.updatedAt)
            };
        });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update entire task
exports.updateTask = async (req, res) => {
    try {
        // Get the logged-in user from the middleware
        const loggedInUser = req.user; 
        if (!loggedInUser || !loggedInUser.name) {
            return res.status(401).json({ message: "Authentication required or user name is missing." });
        }

        const { dueDate, priority, subtasks, title, collaborators, taskOwner, ...otherFields } = req.body;

        // Fetch the original task from the database FIRST
        const docRef = db.collection('tasks').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const originalTask = doc.data();

        // --- PERMISSION CHECK ---
        // Check if the request is trying to change the due date
        if (dueDate !== undefined) {
            const originalDueDateISO = originalTask.dueDate.toDate().toISOString().split('T')[0];
            const newDueDate = new Date(dueDate).toISOString().split('T')[0];

            // If the date is being changed AND the logged-in user is NOT the task owner
            if (originalDueDateISO !== newDueDate && originalTask.taskOwner !== loggedInUser.name) {
                return res.status(403).json({ message: "Forbidden: Only the task owner can change the due date." });
            }
        }
        // --- END OF PERMISSION CHECK ---

        const updateData = {
            ...otherFields,
            updatedAt: admin.firestore.Timestamp.now()
        };

        // Handle validations and build update object
        if (collaborators !== undefined) updateData.collaborators = collaborators;
        if (title !== undefined && (!title || title.trim() === '')) return res.status(400).json({ message: "title is required" });
        if (taskOwner !== undefined && !taskOwner) return res.status(400).json({ message: "Task Owner is required" });
        if (priority !== undefined && !priority) return res.status(400).json({ message: "priority is required" });
        if (subtasks) updateData.subtasks = subtasks;

        if (dueDate !== undefined) {
            const due = new Date(dueDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (due < now) return res.status(400).json({ message: "Cannot set due date in the past" });
            if (isNaN(due.getTime())) return res.status(400).json({ message: "Invalid dueDate" });
            updateData.dueDate = admin.firestore.Timestamp.fromDate(due);
        }

        if (title !== undefined) updateData.title = title;
        if (priority !== undefined) updateData.priority = priority;
        if (taskOwner !== undefined) updateData.taskOwner = taskOwner;

        const { id, createdAt, ...finalUpdateData } = updateData;

        await docRef.update(finalUpdateData);

        res.status(200).json({ message: 'Task updated successfully' });
    } catch (err) {
        console.error("Update Task Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await db.collection('tasks').doc(req.params.id).update({
            status,
            updatedAt: admin.firestore.Timestamp.now()
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
            updatedAt: admin.firestore.Timestamp.now()
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
            updatedAt: admin.firestore.Timestamp.now()
        });
        res.status(200).json({ message: 'Task archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Unarchive task
exports.unarchiveTask = async (req, res) => {
    try {
        await db.collection('tasks').doc(req.params.id).update({
            archived: false,
            updatedAt: admin.firestore.Timestamp.now()
        });
        res.status(200).json({ message: 'Task unarchived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Recurring Tasks
exports.getAllRecurringTasks = async (req, res) => {
    try {
        const snapshot = await db.collection('recurringTasks').get();
        const recurringTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatTimestampToISO(doc.data().createdAt),
            updatedAt: formatTimestampToISO(doc.data().updatedAt),
        }));
        res.status(200).json(recurringTasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Recurring Task
exports.updateRecurringTask = async (req, res) => {
    try {
        const recurringTaskId = req.params.id;
        const { userId, recurrence, taskOwner } = req.body;

        const recurringUpdateData = {
            recurrence,
            updatedAt: admin.firestore.Timestamp.now()
        };
        if (taskOwner) recurringUpdateData.taskOwner = taskOwner;
        await db.collection('recurringTasks').doc(recurringTaskId).update(recurringUpdateData);

        const now = new Date();
        const tasksSnapshot = await db.collection('tasks').where('recurringTaskId', '==', recurringTaskId).get();
        
        const futureInstanceUpdate = {
            recurrence,
            updatedAt: admin.firestore.Timestamp.now()
        };
        if (taskOwner) futureInstanceUpdate.taskOwner = taskOwner;

        const batch = db.batch();
        tasksSnapshot.forEach(doc => {
            const data = doc.data();
            const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
            if (data.status !== 'Completed' && dueDate >= now) {
                batch.update(doc.ref, futureInstanceUpdate);
            }
        });
        await batch.commit();

        if (!recurrence.enabled) {
            await db.collection('recurringTasks').doc(recurringTaskId).update({ active: false });
            
            const batch2 = db.batch();
            tasksSnapshot.forEach(doc => {
                const data = doc.data();
                const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
                if (data.status !== 'Completed' && dueDate >= now) {
                    batch2.update(doc.ref, {
                        recurringTaskId: admin.firestore.FieldValue.delete(),
                        updatedAt: admin.firestore.Timestamp.now()
                    });
                }
            });
            await batch2.commit();
        }

        res.status(200).json({ message: 'Recurrence updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};