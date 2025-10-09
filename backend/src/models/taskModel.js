// models/Task.js
const taskModel = {
  title: "",
  description: "",
  type: "",
  status: "",
  priority: 1,
  projectId: null,
  dueDate: null,
  startTime: null,
  endTime: null,
  assigneeId: null,
  collaborators: [],
  attachments: [],
  subtasks: [],
  archived: false,
  createdAt: null,
  updatedAt: null
};

// Remove undefined fields (Firestore does not allow them)
Object.keys(taskModel).forEach(key => {
  if (taskModel[key] === undefined) {
    delete taskModel[key];
  }
});

module.exports = taskModel;