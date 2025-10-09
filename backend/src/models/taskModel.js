// models/Task.js
const taskModel = {
  title: "",                          // Task name
  description: "",                    // Details
  type: "",                           // Task Meeting etc
  status: "To Do",                    // Default
  priority: 1,                        // Priority level 1-10, default 1
  projectId: null,                    // One project or standalone
  dueDate: new Date(),                // One official due date
  startTime: new Date(),              // Start time
  endTime: new Date(),                // End time
  ownerId: "",                        // Creator
  assigneeId: null,                   // Single assignee or null
  collaborators: [],                  // Extra participants
  attachments: [],                    // PDF URLs
  subtasks: [],                       // Array of subtasks
  archived: false,                    // Soft delete flag
  createdAt: new Date(),
  updatedAt: new Date()
};

module.exports = taskModel;