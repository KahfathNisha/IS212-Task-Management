import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";

let unsubscribeTasks = null;
let unsubscribeNotifications = null;

// This version uses the correct query for a SINGLE STRING assignee field.
function initializeTaskChangeListeners(userId) {
  // --- THIS IS THE FIX ---
  // Query for tasks where the 'assignedTo' STRING field equals the userId.
  const tasksQuery = query(collection(db, "tasks"), where("assignedTo", "==", userId));
  // --- End of Fix ---

  let knownTasks = new Map();
  let isFirstSnapshot = true;

  unsubscribeTasks = onSnapshot(tasksQuery, async (snapshot) => {
    const currentTasks = new Map(snapshot.docs.map(doc => [doc.id, doc.data()]));

    if (isFirstSnapshot) {
      knownTasks = currentTasks;
      isFirstSnapshot = false;
      return;
    }

    const notificationsToCreate = [];

    // Check for NEWLY ASSIGNED or MODIFIED tasks
    for (const [taskId, taskData] of currentTasks.entries()) {
      const knownTask = knownTasks.get(taskId);
      // Case 1: Task is new to the query results (new assignment).
      if (!knownTask) {
        const dueDateText = taskData.dueDate?.toDate ? `Due: ${taskData.dueDate.toDate().toLocaleDateString()}` : 'No due date set.';
        notificationsToCreate.push({
          title: `New Task Assigned: ${taskData.title}`,
          body: `You have been assigned a new task. ${dueDateText}`,
          taskId: taskId,
        });
      } 
      // Case 2: Task was already known. Check if it was updated.
      else if (knownTask.updatedAt?.toMillis() !== taskData.updatedAt?.toMillis()) {
         notificationsToCreate.push({
          title: `Task Updated: ${taskData.title}`,
          body: `A task assigned to you has been updated. Check for changes.`,
          taskId: taskId,
        });
      }
    }

    // Check for REMOVED tasks (user unassigned or task deleted)
    for (const [taskId, taskData] of knownTasks.entries()) {
      // Case 3: Task was known before, but is no longer in the query results.
      if (!currentTasks.has(taskId)) {
        notificationsToCreate.push({
          title: `Removed from Task: ${taskData.title}`,
          body: `You are no longer assigned to this task.`,
          taskId: taskId,
        });
      }
    }

    // Write notifications to the database.
    if (notificationsToCreate.length > 0) {
      const userNotificationsRef = collection(db, "users", userId, "notifications");
      for (const notif of notificationsToCreate) {
        await addDoc(userNotificationsRef, {
          ...notif,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    knownTasks = currentTasks; // Update known state
  });
}

// This function listens for new unread notifications (remains the same)
function initializeUnreadNotificationListener(userId) {
  const notificationStore = useNotificationStore();
  const notificationsQuery = query(
    collection(db, "users", userId, "notifications"),
    where("isRead", "==", false)
  );
  unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        notificationStore.addNotification(change.doc.data());
      }
    });
  });
}

// Exported functions remain the same
export function initializeListeners(userId) {
  initializeTaskChangeListeners(userId);
  initializeUnreadNotificationListener(userId);
}
export async function fetchNotificationHistory(userId) {
  const notificationsQuery = query(collection(db, "users", userId, "notifications"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(notificationsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export function cleanupListeners() {
  if (unsubscribeTasks) unsubscribeTasks();
  if (unsubscribeNotifications) unsubscribeNotifications();
}

