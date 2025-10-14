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
        const { dueDate, assigneeId, title, priority, subtasks } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: "Title is required" });
        }

        if (!dueDate) {
            return res.status(400).json({ message: "Due Date is required" });
        }

        if (!priority) {
            return res.status(400).json({ message: "Priority is required" });
        }

        // Validate subtasks if they exist
        if (subtasks && Array.isArray(subtasks)) {
            for (let i = 0; i < subtasks.length; i++) {
                const subtask = subtasks[i];
                if (!subtask.title || subtask.title.trim() === '') {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Title is required` });
                }
                if (!subtask.dueDate) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Due Date is required` });
                }
                if (!subtask.priority) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Priority is required` });
                }
                // Validate subtask dueDate format
                const subDue = new Date(subtask.dueDate);
                if (isNaN(subDue.getTime())) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Invalid due date format` });
                }
                // Prevent past dates for subtasks
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (subDue < now) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: dueDate cannot be in the past` });
                }
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

        // If the task is recurring, create an entry in recurringTasks collection first
        if (task.recurrence && task.recurrence.enabled) {
            const recurrence = task.recurrence;

            // 1. Create the recurringTasks entry
            const recurringTaskRef = await db.collection('recurringTasks').add({
                userId: assigneeId,
                recurrence: recurrence,
                title: task.title,
                description: task.description,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                active: true
            });

            // 2. Always create the first task instance with the due date from the form
            const firstTaskInstance = {
                ...task,
                recurringTaskId: recurringTaskRef.id // Reference to recurringTasks
            };
            await db.collection('tasks').add(firstTaskInstance);

            // 3. Generate additional recurring task instances (skip the first occurrence)
            let current = new Date(recurrence.startDate || dueDate);
            const end = new Date(recurrence.endDate);
            const interval = recurrence.type === 'custom' ? recurrence.interval : 1;
            let addFn;

            switch (recurrence.type) {
                case 'daily':
                    addFn = date => date.setDate(date.getDate() + 1);
                    break;
                case 'weekly':
                    addFn = date => date.setDate(date.getDate() + 7);
                    break;
                case 'monthly':
                    addFn = date => date.setMonth(date.getMonth() + 1);
                    break;
                case 'custom':
                    addFn = date => date.setDate(date.getDate() + interval);
                    break;
                default:
                    addFn = null;
            }

            // Move to the next recurrence date after the first
            addFn(current);

            while (addFn && current <= end) {
                // Calculate due date with offset
                let dueDateInstance = new Date(current);
                if (recurrence.dueOffset && recurrence.dueOffsetUnit) {
                    if (recurrence.dueOffsetUnit === 'days') {
                        dueDateInstance.setDate(dueDateInstance.getDate() + recurrence.dueOffset);
                    } else if (recurrence.dueOffsetUnit === 'weeks') {
                        dueDateInstance.setDate(dueDateInstance.getDate() + recurrence.dueOffset * 7);
                    }
                }
                const recurringTaskInstance = {
                    ...task,
                    dueDate: admin.firestore.Timestamp.fromDate(dueDateInstance),
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                    recurringTaskId: recurringTaskRef.id
                };
                await db.collection('tasks').add(recurringTaskInstance);
                // Move to next recurrence date
                const next = new Date(current);
                addFn(next);
                current = next;
            }

            res.status(201).json({ id: recurringTaskRef.id, message: 'Recurring task created successfully' });
            return;
        }

        // If not recurring, just create a single task
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
        
        // Convert Timestamps for single task retrieval
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
        const tasks = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // 🚨 FIX: Standardize all Timestamps to ISO strings for frontend compatibility
            const formattedData = {
                ...data,
                dueDate: formatTimestampToISO(data.dueDate),
                createdAt: formatTimestampToISO(data.createdAt),
                updatedAt: formatTimestampToISO(data.updatedAt)
            };
            
            tasks.push({ id: doc.id, ...formattedData });
        });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
   

// Update entire task
exports.updateTask = async (req, res) => {
    try {
        const { dueDate, priority, subtasks, title, collaborators, ...otherFields } = req.body;

        const updateData = {
            ...otherFields,
            updatedAt: admin.firestore.Timestamp.now()
        };

        // Handle collaborators separately to ensure proper structure
        if (collaborators !== undefined) {
            updateData.collaborators = collaborators;
        }


        // Validate title
        if (title !== undefined && (!title || title.trim() === '')) {
            return res.status(400).json({ message: "title is required" });
        }

        // Validate priority
        if (priority !== undefined && !priority) {
            return res.status(400).json({ message: "priority is required" });
        }

        // Validate subtasks if they exist
        if (subtasks && Array.isArray(subtasks)) {
            for (let i = 0; i < subtasks.length; i++) {
                const subtask = subtasks[i];
                if (!subtask.title || subtask.title.trim() === '') {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Title is required` });
                }
                if (!subtask.dueDate) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Due Date is required` });
                }
                if (!subtask.priority) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Priority is required` });
                }
                // Validate subtask dueDate format
                const subDue = new Date(subtask.dueDate);
                if (isNaN(subDue.getTime())) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: Invalid dueDate format` });
                }
                // Prevent past dates for subtasks
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (subDue < now) {
                    return res.status(400).json({ message: `Subtask ${i + 1}: dueDate cannot be in the past` });
                }
            }
        }

        // Handle due date validation
        if (dueDate !== undefined) {
            if (!dueDate) {
                return res.status(400).json({ message: "dueDate is required" });
            }

            const due = new Date(dueDate);

            // Prevent past dates
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            if (due < now) {
                return res.status(400).json({
                    message: "Cannot set due date in the past"
                });
            }

            if (isNaN(due.getTime())) {
                return res.status(400).json({ message: "Invalid dueDate" });
            }

            updateData.dueDate = admin.firestore.Timestamp.fromDate(due);
        }

        // Handle title and priority updates
        if (title !== undefined) updateData.title = title;
        if (priority !== undefined) updateData.priority = priority;

        // Remove fields that shouldn't be updated
        const { id, createdAt, ...finalUpdateData } = updateData;


        // Check if document exists first
        const docRef = db.collection('tasks').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Task not found' });
        }
        await docRef.update(finalUpdateData);

        res.status(200).json({ message: 'Task updated successfully' });
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

// Get All Recurring Tasks
exports.getAllRecurringTasks = async (req, res) => {
    try {
        const snapshot = await db.collection('recurringTasks').get();
        const recurringTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            // Convert timestamps here too, just in case the frontend uses this data
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
        const { userId, recurrence } = req.body;

        // 2. Update recurrence rules
        await db.collection('recurringTasks').doc(recurringTaskId).update({
            recurrence,
            updatedAt: admin.firestore.Timestamp.now()
        });

        // 3. Apply changes only to future instances (not past/completed)
        const now = new Date();
        const tasksSnapshot = await db.collection('tasks')
            .where('recurringTaskId', '==', recurringTaskId)
            .get();

        const batch = db.batch();
        tasksSnapshot.forEach(doc => {
            const data = doc.data();
            // Need a reliable way to get JS Date from Firestore Timestamp object
            const dueDate = data.dueDate && data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
            if (
                data.status !== 'Completed' &&
                dueDate >= now
            ) {
                batch.update(doc.ref, {
                    recurrence,
                    updatedAt: admin.firestore.Timestamp.now()
                });
            }
        });
        await batch.commit();

        // 4. If recurrence is removed, update recurringTasks and tasks accordingly
        if (!recurrence.enabled) {
            // Mark recurringTasks as inactive
            await db.collection('recurringTasks').doc(recurringTaskId).update({
                active: false
            });
            // Optionally, remove recurringTaskId from future tasks
            const batch2 = db.batch();
            tasksSnapshot.forEach(doc => {
                const data = doc.data();
                const dueDate = data.dueDate && data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
                if (
                    data.status !== 'Completed' &&
                    dueDate >= now
                ) {
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