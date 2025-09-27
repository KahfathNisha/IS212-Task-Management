// models/Task.js
const taskModel = {
  title: "",                          // Task name
  description: "",                    // Details
  dueDate: new Date(),                // One official due date
  status: "Unassigned",               // Default
  ownerId: "",                        // Creator
  assigneeId: null,                   // Single assignee or null
  projectId: null,                    // One project or standalone
  collaborators: [],                  // Extra participants
  attachments: [],                    // PDF URLs
  archived: false,                    // Soft delete flag
  createdAt: new Date(),
  updatedAt: new Date()
};

module.exports = taskModel;