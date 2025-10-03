import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";

let unsubscribeTasks = null;
let unsubscribeNotifications = null;

// This function has been completely rewritten with a more robust, manual-comparison logic
// to definitively fix the bug of incorrect notification types.
function initializeTaskChangeListeners(userId) {
  // This map will store the state of the user's tasks from the last snapshot.
  let knownTasks = new Map();
  let isFirstSnapshot = true;

  const tasksQuery = query(collection(db, "tasks"), where("assignedTo", "array-contains", userId));

  unsubscribeTasks = onSnapshot(tasksQuery, async (snapshot) => {
    const currentTasks = new Map(snapshot.docs.map(doc => [doc.id, doc.data()]));

    // On the very first run, we just populate the initial state without sending notifications.
    if (isFirstSnapshot) {
      knownTasks = currentTasks;
      isFirstSnapshot = false;
      return;
    }

    const notificationsToCreate = [];

    // Check for NEWLY ASSIGNED or MODIFIED tasks
    for (const [taskId, taskData] of currentTasks.entries()) {
      const knownTask = knownTasks.get(taskId);
      // Case 1: Task is in the new snapshot, but wasn't known before. It's a new assignment.
      if (!knownTask) {
        const dueDateText = taskData.dueDate?.toDate ? `Due: ${taskData.dueDate.toDate().toLocaleDateString()}` : 'No due date set.';
        notificationsToCreate.push({
          title: `New Task Assigned: ${taskData.title}`,
          body: `You have been assigned a new task. ${dueDateText}`,
          taskId: taskId,
        });
      } 
      // Case 2: Task was known before. Check if it has been meaningfully updated.
      // We compare the 'updatedAt' timestamp for simplicity and reliability.
      else if (knownTask.updatedAt?.toMillis() !== taskData.updatedAt?.toMillis()) {
         notificationsToCreate.push({
          title: `Task Updated: ${taskData.title}`,
          body: `A task assigned to you has been updated. Check for changes.`,
          taskId: taskId,
        });
      }
    }

    // Check for REMOVED or DELETED tasks
    for (const [taskId, taskData] of knownTasks.entries()) {
      // Case 3: A task was known before, but is no longer in the current snapshot. It was removed/deleted.
      if (!currentTasks.has(taskId)) {
        notificationsToCreate.push({
          title: `Removed from Task: ${taskData.title}`,
          body: `You are no longer assigned to this task.`,
          taskId: taskId,
        });
      }
    }

    // Write all detected notifications to the database.
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

    // Finally, update our known state to the current state for the next comparison.
    knownTasks = currentTasks;
  });
}

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

// This file now correctly exports all necessary functions for your app.
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

