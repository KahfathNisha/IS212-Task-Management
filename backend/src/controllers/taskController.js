const { db, admin } = require('../config/firebase');
const taskModel = require('../models/taskModel');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

// --- Helper function for Timestamp conversion ---
const formatTimestampToISO = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    // If it's not a Firestore Timestamp, return the original data.
    return timestamp;
};

// --- Helper function to update project statistics ---
const updateProjectStats = async (projectId) => {
    if (!projectId) return;
    
    try {
        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        
        if (!projectDoc.exists) {
            console.warn(`⚠️ Project ${projectId} not found`);
            return;
        }
        
        // Get all non-archived tasks for this project
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', projectId)
            .where('archived', '==', false)
            .get();
        
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        await projectRef.update({
            totalTasks,
            completedTasks,
            progress,
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        console.log(`✅ Updated project ${projectId}: ${completedTasks}/${totalTasks} tasks (${progress}%)`);
        
    } catch (error) {
        console.error(`❌ Error updating project stats for ${projectId}:`, error);
    }
};

// Create Task
exports.createTask = async (req, res) => {
    try {
        // Entry log for debugging task creation calls
        console.log('📥 [TaskController] createTask called by:', req.user?.email || 'unknown');
        console.log('   Incoming payload:', {
            title: req.body?.title,
            assigneeId: req.body?.assigneeId,
            assignedTo: req.body?.assignedTo,
            dueDate: req.body?.dueDate,
            projectId: req.body?.projectId
        });
        // ADDED: taskOwnerDepartment destructuring
        const { dueDate, assigneeId, title, priority, subtasks, taskOwner, taskOwnerDepartment } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: "Title is required" });
        }
        
        if (!taskOwner) {
            return res.status(400).json({ message: "Task Owner is required" });
        }
        
        // ADDED: Validation for taskOwnerDepartment
        if (!taskOwnerDepartment) {
            return res.status(400).json({ message: "Task Owner Department is required" });
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
            categories: req.body.categories || [],
            archived: false,
            // Initialize status history with the initial status
            statusHistory: [{
                timestamp: admin.firestore.Timestamp.now(),
                oldStatus: null,
                newStatus: req.body.status || 'Unassigned'
            }]
            // taskOwnerDepartment is included via the spread of req.body
        };

        if (task.recurrence && task.recurrence.enabled) {
            const recurrence = task.recurrence;
            const recurringTaskRef = await db.collection('recurringTasks').add({
                taskOwner: task.taskOwner,
                taskOwnerDepartment: taskOwnerDepartment, // ADDED
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
                addFn(current);
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
        
        // Update project stats if task belongs to a project
        if (req.body.projectId) {
            await updateProjectStats(req.body.projectId);
        }

        // Send notification to assignee if task is assigned
        if (assigneeId) {
            try {
                console.log(`📢 [TaskController] Sending "New Task Assigned" notification:`);
                console.log(`   Task: "${title}"`);
                console.log(`   Assignee: ${assigneeId}`);
                console.log(`   TaskId: ${docRef.id}`);
                
                const notificationData = {
                    title: `New Task Assigned`,
                    body: `You have been assigned a new task: "${title}"`,
                    taskId: docRef.id,
                    type: 'info'
                };

                await NotificationService.sendNotification(assigneeId, notificationData, {
                    sendEmail: false
                });
                
                console.log(`✅ [TaskController] "New Task Assigned" notification sent successfully`);
            } catch (error) {
                console.error('❌ [TaskController] Failed to send task assignment notification:', error);
                // Don't fail the task creation if notification fails
            }
        }
        
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
        taskData.updatedAt = formatTimestampToISO(taskData.updatedAt);
        
        // Format status history timestamps
        if (taskData.statusHistory && Array.isArray(taskData.statusHistory)) {
            taskData.statusHistory = taskData.statusHistory.map(entry => ({
                ...entry,
                timestamp: formatTimestampToISO(entry.timestamp)
            }));
        } else {
            // If no statusHistory exists (for tasks created before this feature), create initial entry
            taskData.statusHistory = [{
                timestamp: formatTimestampToISO(taskData.createdAt),
                oldStatus: null,
                newStatus: taskData.status
            }];
        }
        
        res.status(200).json(taskData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Tasks
exports.getAllTasks = async (req, res) => {
    try {
        const { email, role, department } = req.user;
        console.log('📋 [getAllTasks] Fetching tasks for:', { email, role, department });
        
        const snapshot = await db.collection('tasks').get();
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();

            // Format status history timestamps
            let statusHistory = [];
            if (data.statusHistory && Array.isArray(data.statusHistory)) {
                statusHistory = data.statusHistory.map(entry => ({
                    ...entry,
                    timestamp: formatTimestampToISO(entry.timestamp)
                }));
            } else {
                // If no statusHistory exists (for tasks created before this feature), create initial entry
                statusHistory = [{
                    timestamp: formatTimestampToISO(data.createdAt),
                    oldStatus: null,
                    newStatus: data.status
                }];
            }

            return {
                id: doc.id,
                ...data,
                dueDate: formatTimestampToISO(data.dueDate),
                createdAt: formatTimestampToISO(data.createdAt),
                updatedAt: formatTimestampToISO(data.updatedAt),
                statusHistory: statusHistory
            };
        });
        console.log('✅ [getAllTasks] Returning', tasks.length, 'tasks');
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Tasks by Project ID
exports.getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        const tasksQuery = db.collection('tasks')
            .where('projectId', '==', projectId)
            .where('archived', '==', false);

        const snapshot = await tasksQuery.get();
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();

            // Format status history timestamps
            let statusHistory = [];
            if (data.statusHistory && Array.isArray(data.statusHistory)) {
                statusHistory = data.statusHistory.map(entry => ({
                    ...entry,
                    timestamp: formatTimestampToISO(entry.timestamp)
                }));
            } else {
                // If no statusHistory exists (for tasks created before this feature), create initial entry
                statusHistory = [{
                    timestamp: formatTimestampToISO(data.createdAt),
                    oldStatus: null,
                    newStatus: data.status
                }];
            }

            return {
                id: doc.id,
                ...data,
                dueDate: formatTimestampToISO(data.dueDate),
                createdAt: formatTimestampToISO(data.createdAt),
                updatedAt: formatTimestampToISO(data.updatedAt),
                statusHistory: statusHistory
            };
        });

        console.log(`Found ${tasks.length} tasks for project: ${projectId}`);
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Get tasks by project error:', err);
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

        // ADDED: taskOwnerDepartment destructuring
        const { dueDate, priority, subtasks, title, collaborators, taskOwner, taskOwnerDepartment, ...otherFields } = req.body;

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
            // Check both email and name for compatibility
            const isOwner = originalTask.taskOwner === loggedInUser.email || originalTask.taskOwner === loggedInUser.name;
            if (originalDueDateISO !== newDueDate && !isOwner) {
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
        // ADDED: Validation for taskOwnerDepartment
        if (taskOwnerDepartment !== undefined && !taskOwnerDepartment) return res.status(400).json({ message: "Task Owner Department is required" });
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
        // ADDED: Include taskOwnerDepartment in updateData
        if (taskOwnerDepartment !== undefined) updateData.taskOwnerDepartment = taskOwnerDepartment;

        // Check for assignee changes to trigger email notifications
        const oldAssigneeId = originalTask.assigneeId;
        const newAssigneeId = otherFields.assigneeId;
        
        // Check for status changes to track status history
        const oldStatus = originalTask.status;
        const newStatus = otherFields.status;

        // VALIDATION: Prevent same-tier assignment and transfer ownership when assigned
        if (newAssigneeId !== undefined && newAssigneeId !== oldAssigneeId) {
            // Fetch new assignee's user data to check their role
            const newAssigneeDoc = await db.collection('Users').doc(newAssigneeId).get();
            
            if (!newAssigneeDoc.exists) {
                return res.status(404).json({ message: 'New assignee not found' });
            }
            
            const newAssigneeData = newAssigneeDoc.data();
            
            // Hierarchy: director > manager > staff (HR has special permissions but can't be assigned)
            const roleHierarchy = { 'director': 3, 'manager': 2, 'staff': 1, 'hr': 0 };
            const assignerRole = roleHierarchy[loggedInUser.role.toLowerCase()] || 0;
            const assigneeRole = roleHierarchy[newAssigneeData.role?.toLowerCase()] || 0;
            
            // Prevent assignment if assignee is same tier or higher
            if (assigneeRole >= assignerRole) {
                return res.status(403).json({ message: 'Cannot assign tasks to users of the same or higher tier' });
            }
            
            // Transfer ownership to assignee
            updateData.taskOwner = newAssigneeId;
            
            // Also update taskOwnerDepartment to match assignee's department
            const newAssigneeDept = newAssigneeData.department;
            if (newAssigneeDept) {
                updateData.taskOwnerDepartment = newAssigneeDept;
            }
            
            console.log(`✅ [updateTask] Transferring ownership to: ${newAssigneeId} (${newAssigneeData.role})`);
        }

        // Add status history entry if status changed
        if (newStatus !== undefined && newStatus !== oldStatus) {
            const statusHistoryEntry = {
                timestamp: admin.firestore.Timestamp.now(),
                oldStatus: oldStatus,
                newStatus: newStatus
            };
            
            const existingStatusHistory = originalTask.statusHistory || [];
            await docRef.update({
                statusHistory: [...existingStatusHistory, statusHistoryEntry]
            });
            
            console.log(`✅ [updateTask] Added status history for task ${req.params.id}: ${oldStatus} → ${newStatus}`);
        }

        const { id, createdAt, ...finalUpdateData } = updateData;

        await docRef.update(finalUpdateData);

        // Send reassignment emails if assignee changed
        if (newAssigneeId !== undefined && newAssigneeId !== oldAssigneeId) {
            await sendReassignmentEmails(req.params.id, newAssigneeId, oldAssigneeId, loggedInUser.name);
        }

        // Update project stats if projectId changed
        if (otherFields.projectId !== undefined) {
            // Update old project if task was moved from another project
            if (originalTask.projectId && originalTask.projectId !== otherFields.projectId) {
                await updateProjectStats(originalTask.projectId);
            }
            // Update new project
            if (otherFields.projectId) {
                await updateProjectStats(otherFields.projectId);
            }
        }

        // Send notifications about task update
        if (originalTask.assigneeId) {
            try {
                // Check if assignee changed
                const assigneeChanged = req.body.assigneeId && req.body.assigneeId !== originalTask.assigneeId;
                const statusChanged = req.body.status && req.body.status !== originalTask.status;
                
                if (assigneeChanged) {
                    console.log(`📢 [TaskController] Sending "Removed from Task" notification:`);
                    console.log(`   Task: "${originalTask.title}"`);
                    console.log(`   Old Assignee: ${originalTask.assigneeId}`);
                    console.log(`   TaskId: ${req.params.id}`);
                    
                    // Notify old assignee they were unassigned
                    const unassignNotificationData = {
                        title: `Removed from Task`,
                        body: `You are no longer assigned to task "${originalTask.title}"`,
                        taskId: req.params.id,
                        type: 'info'
                    };

                    await NotificationService.sendNotification(originalTask.assigneeId, unassignNotificationData, {
                        sendEmail: false
                    });
                    
                    console.log(`✅ [TaskController] "Removed from Task" notification sent successfully`);

                    // Notify new assignee they were assigned
                    if (req.body.assigneeId) {
                        console.log(`📢 [TaskController] Sending "Task Assigned" notification:`);
                        console.log(`   Task: "${originalTask.title}"`);
                        console.log(`   New Assignee: ${req.body.assigneeId}`);
                        console.log(`   TaskId: ${req.params.id}`);
                        
                        const assignNotificationData = {
                            title: `Task Assigned`,
                            body: `You have been assigned to task "${originalTask.title}"`,
                            taskId: req.params.id,
                            type: 'info'
                        };

                        await NotificationService.sendNotification(req.body.assigneeId, assignNotificationData, {
                            sendEmail: false
                        });
                        
                        console.log(`✅ [TaskController] "Task Assigned" notification sent successfully`);
                    }
                } else if (statusChanged) {
                    console.log(`📢 [TaskController] Sending "Task Status Updated" notification:`);
                    console.log(`   Task: "${originalTask.title}"`);
                    console.log(`   Old Status: ${originalTask.status}`);
                    console.log(`   New Status: ${req.body.status}`);
                    console.log(`   Assignee: ${originalTask.assigneeId}`);
                    console.log(`   TaskId: ${req.params.id}`);
                    
                    // Notify about status change
                    const statusNotificationData = {
                        title: `Task Status Updated`,
                        body: `Task "${originalTask.title}" status changed to "${req.body.status}"`,
                        taskId: req.params.id,
                        type: req.body.status === 'Completed' ? 'success' : 'info'
                    };

                    await NotificationService.sendNotification(originalTask.assigneeId, statusNotificationData, {
                        sendEmail: false
                    });
                    
                    console.log(`✅ [TaskController] "Task Status Updated" notification sent successfully`);
                } else {
                    // General task update notification
                    const notificationData = {
                        title: `Task Updated`,
                        body: `Task "${originalTask.title}" has been updated`,
                        taskId: req.params.id,
                        type: 'info'
                    };

                    await NotificationService.sendNotification(originalTask.assigneeId, notificationData, {
                        sendEmail: false
                    });
                }
            } catch (error) {
                console.error('Failed to send task update notification:', error);
                // Don't fail the task update if notification fails
            }
        }

        res.status(200).json({ message: 'Task updated successfully' });
    } catch (err) {
        console.error("Update Task Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        console.log(`🔥 [updateTaskStatus] =============================================`);
        console.log(`🔥 [updateTaskStatus] FUNCTION CALLED!`);
        console.log(`🔥 [updateTaskStatus] Method: ${req.method}`);
        console.log(`🔥 [updateTaskStatus] URL: ${req.url}`);
        console.log(`🔥 [updateTaskStatus] Task ID: ${req.params.id}`);
        console.log(`🔥 [updateTaskStatus] Request body:`, JSON.stringify(req.body, null, 2));
        console.log(`🔥 [updateTaskStatus] Headers:`, req.headers);
        console.log(`🔥 [updateTaskStatus] =============================================`);

        const { status } = req.body;
        
        if (!status) {
            console.log(`❌ [updateTaskStatus] ERROR: No status provided in request body`);
            return res.status(400).json({ message: 'Status is required' });
        }

        // console.log(`📝 [updateTaskStatus] Starting update process for task ${req.params.id} to status: ${status}`);
        
        const taskDocRef = db.collection('tasks').doc(req.params.id);
        const taskDoc = await taskDocRef.get();
        
        if (!taskDoc.exists) {
            console.log(`❌ [updateTaskStatus] ERROR: Task ${req.params.id} not found in database`);
            return res.status(404).json({ message: 'Task not found' });
        }
        
        const task = taskDoc.data();
        const oldStatus = task.status;
        const newStatus = status;
        
        // console.log(`📋 [updateTaskStatus] Task found:`);
        // console.log(`   Title: ${task.title}`);
        // console.log(`   Old Status: ${oldStatus}`);
        // console.log(`   New Status: ${newStatus}`);
        // console.log(`   Has existing statusHistory: ${task.hasOwnProperty('statusHistory')}`);
        // console.log(`   Existing statusHistory length: ${(task.statusHistory || []).length}`);
        // console.log(`   Existing statusHistory:`, task.statusHistory || []);
        // console.log(`   Task ID: ${req.params.id}`);
        // console.log(`   Task object keys:`, Object.keys(task));
        // console.log(`   Full task object:`, JSON.stringify(task, null, 2));
        
        // Only update if status actually changed
        if (oldStatus === newStatus) {
            console.log(`⚠️ [updateTaskStatus] Status unchanged, skipping update`);
            return res.status(200).json({ message: 'Task status unchanged' });
        }
        
        // Create status history entry
        const statusHistoryEntry = {
            timestamp: admin.firestore.Timestamp.now(),
            oldStatus: oldStatus,
            newStatus: newStatus
        };
        
        // Get existing status history or create new array
        const existingStatusHistory = task.statusHistory || [];
        let updatedStatusHistory;
        if (existingStatusHistory.length === 0) {
            // If no statusHistory, add the initial entry and the change
            updatedStatusHistory = [
                {
                    timestamp: admin.firestore.Timestamp.now(),
                    oldStatus: null,
                    newStatus: oldStatus
                },
                statusHistoryEntry
            ];
        } else {
            updatedStatusHistory = [...existingStatusHistory, statusHistoryEntry];
        }
        
        // console.log(`💾 [updateTaskStatus] Preparing Firebase update:`);
        // console.log(`   New status: ${newStatus}`);
        // console.log(`   History entry:`, statusHistoryEntry);
        // console.log(`   Existing history length: ${existingStatusHistory.length}`);
        // console.log(`   Updated history length: ${updatedStatusHistory.length}`);
        // console.log(`   Updated history:`, updatedStatusHistory);
        
        // Update task with new status and status history
        console.log(`🔥 [updateTaskStatus] About to call Firebase update...`);

        // Separate the statusHistory update to avoid Firestore rules issues
        console.log(`🔥 [updateTaskStatus] First updating status and updatedAt...`);
        await taskDocRef.update({
            status: newStatus,
            updatedAt: admin.firestore.Timestamp.now()
        });
        console.log(`✅ [updateTaskStatus] Status update completed!`);

        console.log(`🔥 [updateTaskStatus] Now updating statusHistory separately...`);
        await taskDocRef.update({
            statusHistory: updatedStatusHistory
        });
        console.log(`✅ [updateTaskStatus] StatusHistory update completed!`);
        
        // Verify the update worked
        // console.log(`🔍 [updateTaskStatus] Verifying the update...`);
        // const verifyDoc = await taskDocRef.get();
        // const verifyData = verifyDoc.data();
        // console.log(`✅ [updateTaskStatus] Verification:`);
        // console.log(`   Current status in DB: ${verifyData.status}`);
        // console.log(`   Status history length in DB: ${(verifyData.statusHistory || []).length}`);
        // console.log(`   Status history in DB:`, verifyData.statusHistory || []);
        // console.log(`   Full verified task data:`, JSON.stringify(verifyData, null, 2));
        
        // Update project progress if status changed to/from Completed
        if (task.projectId && (newStatus === 'Completed' || oldStatus === 'Completed')) {
            console.log(`📊 [updateTaskStatus] Updating project progress for project ${task.projectId}`);
            await updateProjectStats(task.projectId);
        }
        
        // Send notification about status change
        if (task.assigneeId) {
            try {
                console.log(`📢 [updateTaskStatus] Sending notification to ${task.assigneeId}`);
                const statusNotificationData = {
                    title: `Task Status Updated`,
                    body: `Task "${task.title}" status changed to "${newStatus}"`,
                    taskId: req.params.id,
                    type: newStatus === 'Completed' ? 'success' : 'info'
                };

                await NotificationService.sendNotification(task.assigneeId, statusNotificationData, {
                    sendEmail: false
                });
                console.log(`✅ [updateTaskStatus] Notification sent successfully`);
            } catch (error) {
                console.error('❌ [updateTaskStatus] Failed to send status change notification:', error);
                // Don't fail the status update if notification fails
            }
        }
        
        console.log(`🎉 [updateTaskStatus] SUCCESS: Task ${req.params.id} status updated: ${oldStatus} → ${newStatus}`);
        console.log(`🎉 [updateTaskStatus] Status history now has ${updatedStatusHistory.length} entries`);
        console.log(`🔥 [updateTaskStatus] =============================================`);
        
        res.status(200).json({ message: 'Task status updated' });
    } catch (err) {
        console.error(`❌ [updateTaskStatus] ERROR:`, err);
        console.error(`❌ [updateTaskStatus] Stack:`, err.stack);
        res.status(500).json({ error: err.message });
    }
};

// Helper function to send reassignment emails
const sendReassignmentEmails = async (taskId, newAssigneeId, oldAssigneeId, reassignedBy) => {
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (!taskDoc.exists) return;

        const taskData = taskDoc.data();
        const reassignmentTime = admin.firestore.Timestamp.now();

        // Send email to new assignee if assigned
        if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
            const newAssigneeDoc = await db.collection('Users').doc(newAssigneeId).get();
            if (newAssigneeDoc.exists()) {
                const newAssigneeData = newAssigneeDoc.data();
                const settings = newAssigneeData.notificationSettings || {};

                if (settings.emailEnabled && settings.emailReassignmentAdd) {
                    await EmailService.sendReassignmentNotification(
                        newAssigneeId, // email is the document ID
                        taskData,
                        'assigned',
                        reassignedBy,
                        reassignmentTime,
                        newAssigneeData.timezone || 'UTC'
                    );
                }
            }
        }

        // Send email to old assignee if removed
        if (oldAssigneeId && oldAssigneeId !== newAssigneeId) {
            const oldAssigneeDoc = await db.collection('Users').doc(oldAssigneeId).get();
            if (oldAssigneeDoc.exists()) {
                const oldAssigneeData = oldAssigneeDoc.data();
                const settings = oldAssigneeData.notificationSettings || {};

                if (settings.emailEnabled && settings.emailReassignmentRemove) {
                    await EmailService.sendReassignmentNotification(
                        oldAssigneeId, // email is the document ID
                        taskData,
                        'removed',
                        reassignedBy,
                        reassignmentTime,
                        oldAssigneeData.timezone || 'UTC'
                    );
                }
            }
        }

        // Send confirmation to original task owner if different from reassignedBy
        if (taskData.taskOwner && taskData.taskOwner !== reassignedBy) {
            const ownerDoc = await db.collection('Users').where('name', '==', taskData.taskOwner).get();
            if (!ownerDoc.empty) {
                const ownerData = ownerDoc.docs[0].data();
                const ownerEmail = ownerDoc.docs[0].id;
                const settings = ownerData.notificationSettings || {};

                if (settings.emailEnabled) {
                    await EmailService.sendReassignmentNotification(
                        ownerEmail,
                        taskData,
                        'transferred', // Special type for owner confirmation
                        reassignedBy,
                        reassignmentTime,
                        ownerData.timezone || 'UTC'
                    );
                }
            }
        }
    } catch (error) {
        console.error('Error sending reassignment emails:', error);
        // Don't throw error to avoid breaking the main flow
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
        const taskDoc = await db.collection('tasks').doc(req.params.id).get();
        const task = taskDoc.data();
        
        await db.collection('tasks').doc(req.params.id).update({
            archived: true,
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        // Update project stats when task is archived
        if (task.projectId) {
            await updateProjectStats(task.projectId);
        }
        
        // Send notification about task archiving
        if (task.assigneeId) {
            try {
                const archiveNotificationData = {
                    title: `Task Archived`,
                    body: `Task "${task.title}" has been archived`,
                    taskId: req.params.id,
                    type: 'warning'
                };

                await NotificationService.sendNotification(task.assigneeId, archiveNotificationData, {
                    sendEmail: false
                });
            } catch (error) {
                console.error('Failed to send archive notification:', error);
                // Don't fail the archive if notification fails
            }
        }
        
        res.status(200).json({ message: 'Task archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Unarchive task
exports.unarchiveTask = async (req, res) => {
    try {
        const taskDoc = await db.collection('tasks').doc(req.params.id).get();
        const task = taskDoc.data();
        
        await db.collection('tasks').doc(req.params.id).update({
            archived: false,
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        // Update project stats when task is unarchived
        if (task.projectId) {
            await updateProjectStats(task.projectId);
        }
        
        // Send notification about task unarchiving
        if (task.assigneeId) {
            try {
                const unarchiveNotificationData = {
                    title: `Task Restored`,
                    body: `Task "${task.title}" has been restored from archive`,
                    taskId: req.params.id,
                    type: 'info'
                };

                await NotificationService.sendNotification(task.assigneeId, unarchiveNotificationData, {
                    sendEmail: false
                });
            } catch (error) {
                console.error('Failed to send unarchive notification:', error);
                // Don't fail the unarchive if notification fails
            }
        }
        
        res.status(200).json({ message: 'Task unarchived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Recurring Tasks
exports.getAllRecurringTasks = async (req, res) => {
    try {
        // Get userId from query parameters or request user
        const userId = req.user.email;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Query recurring tasks for the specific user
        const snapshot = await db.collection('recurringTasks')
            .where('taskOwner', '==', userId)
            .get();
            
        const recurringTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatTimestampToISO(doc.data().createdAt),
            updatedAt: formatTimestampToISO(doc.data().updatedAt),
        }));
        
        console.log(`Found ${recurringTasks.length} recurring tasks for user: ${userId}`);
        res.status(200).json(recurringTasks);
    } catch (err) {
        console.error('Get recurring tasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update Recurring Task
exports.updateRecurringTask = async (req, res) => {
    try {
        const recurringTaskId = req.params.id;
        
        const {recurrence, taskOwner, taskOwnerDepartment } = req.body;

        const recurringUpdateData = {
            recurrence,
            updatedAt: admin.firestore.Timestamp.now()
        };
        if (taskOwner) recurringUpdateData.taskOwner = taskOwner;
        
        if (taskOwnerDepartment) recurringUpdateData.taskOwnerDepartment = taskOwnerDepartment; 

        await db.collection('recurringTasks').doc(recurringTaskId).update(recurringUpdateData);

        const now = new Date();
        const tasksSnapshot = await db.collection('tasks').where('recurringTaskId', '==', recurringTaskId).get();
        
        const futureInstanceUpdate = {
            recurrence,
            updatedAt: admin.firestore.Timestamp.now()
        };
        if (taskOwner) futureInstanceUpdate.taskOwner = taskOwner;
        // ADDED: Update taskOwnerDepartment in future instances
        if (taskOwnerDepartment) futureInstanceUpdate.taskOwnerDepartment = taskOwnerDepartment; 

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