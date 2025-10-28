<template>
  <v-container>
    <v-card
      max-width="600"
      class="mx-auto"
    >
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon
          start
          icon="mdi-cog"
        ></v-icon>
        Notification Settings
      </v-card-title>
      <v-card-text>
        <p class="mb-4">
          Control which notifications you receive.
        </p>

        <div v-if="!loading">
          <!-- Email Notifications Section -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-h6">Email Notifications</v-card-title>
            <v-card-text>
              <v-switch
                v-model="settings.emailEnabled"
                label="Enable Email Notifications"
                color="primary"
                inset
                class="mb-4"
              ></v-switch>

              <!-- Timezone Selection -->
              <div v-if="settings.emailEnabled" class="mb-4">
                <v-select
                  v-model="settings.timezone"
                  :items="timezones"
                  label="Timezone"
                  :disabled="!settings.emailEnabled"
                ></v-select>
              </div>

              <!-- Email Reminder Settings -->
              <div v-if="settings.emailEnabled">
                <!-- Email Reassignment Notifications -->
                <div class="mb-4">
                  <p class="text-subtitle-2 mb-2">Task Reassignment Notifications:</p>
                  <v-list>
                    <v-list-item>
                      <v-switch
                        v-model="settings.emailReassignmentAdd"
                        label="Task Assignments"
                        details="Receive email when you are assigned to a new task."
                        color="primary"
                        inset
                        hide-details
                      ></v-switch>
                    </v-list-item>
                    <v-list-item>
                      <v-switch
                        v-model="settings.emailReassignmentRemove"
                        label="Task Removals"
                        details="Receive email when you are removed from a task."
                        color="primary"
                        inset
                        hide-details
                      ></v-switch>
                    </v-list-item>
                  </v-list>
                </div>

                <!-- Default Preset Display -->
                <div v-if="settings.emailReminderType === 'preset'">
                  <p class="text-subtitle-2 mb-3">Deadline Reminder Schedule:</p>
                  <div class="d-flex flex-wrap gap-4 mb-6">
                    <v-chip
                      v-for="day in [7, 3, 1]"
                      :key="day"
                      variant="outlined"
                      color="primary"
                      class="pa-4 ma-1"
                    >
                      {{ day }} day{{ day > 1 ? 's' : '' }} before
                    </v-chip>
                  </div>

                  <v-btn
                    variant="outlined"
                    color="primary"
                    @click="openCustomDialog()"
                    class="mt-4 mb-2"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Custom Reminders
                  </v-btn>
                </div>

                <!-- Custom Reminders Display -->
                <div v-else>
                  <p class="text-subtitle-2 mb-2">Reminder Schedule:</p>
                  <div class="d-flex flex-wrap gap-4 mb-6">
                    <v-chip
                      v-for="reminder in sortedCustomReminders"
                      :key="reminder.id"
                      variant="outlined"
                      color="secondary"
                      class="pa-4 ma-1"
                    >
                      {{ reminder.display }}
                    </v-chip>
                  </div>

                  <!-- Error message if no reminders -->
                  <div v-if="sortedCustomReminders.length === 0" class="mb-4">
                    <v-alert
                      type="error"
                      variant="tonal"
                      class="text-body-2"
                    >
                      <v-icon start>mdi-alert-circle</v-icon>
                      You must have at least one reminder frequency scheduled.
                    </v-alert>
                  </div>

                  <div class="d-flex gap-6 mt-4 mb-2">
                    <v-btn
                      variant="outlined"
                      color="primary"
                      @click="showAddReminderDialog = true"
                    >
                      <v-icon start>mdi-plus</v-icon>
                      Set Reminder Timing
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Add Reminder Dialog -->
          <v-dialog v-model="showAddReminderDialog" max-width="400px" persistent>
            <v-card class="bg-surface" elevation="8">
              <v-card-title>Set Reminder Timing</v-card-title>
              <v-card-text>
                <p class="mb-4">Choose when to receive task deadline reminders:</p>

                <v-btn
                  block
                  variant="outlined"
                  color="primary"
                  class="mb-3"
                  @click="openCustomDialog()"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Custom
                </v-btn>

                <v-btn
                  block
                  variant="outlined"
                  color="secondary"
                  @click="switchToDefault()"
                >
                  <v-icon start>mdi-refresh</v-icon>
                  Use Default 
                </v-btn>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="showAddReminderDialog = false">Cancel</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Custom Reminders Dialog -->
          <v-dialog v-model="showCustomDialog" max-width="500px" persistent>
            <v-card class="bg-surface" elevation="8">
              <v-card-title>Custom Email Reminders</v-card-title>
              <v-card-text>
                <p class="mb-4">Notify me:</p>

                <div v-for="(reminder, index) in customReminders" :key="index" class="d-flex align-center mb-2">
                  <v-text-field
                    v-model.number="customReminders[index].value"
                    :label="customReminders[index].unit === 'hours' ? 'Hours before deadline' : 'Days before deadline'"
                    type="number"
                    :rules="[v => v > 0 || 'Must be greater than 0']"
                    class="mr-2"
                    dense
                  ></v-text-field>
                  <v-select
                    v-model="customReminders[index].unit"
                    :items="['hours', 'days']"
                    class="mr-2"
                    style="width: 100px;"
                  ></v-select>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click="removeCustomReminder(index)"
                  ></v-btn>
                </div>

                <v-btn
                  variant="outlined"
                  size="small"
                  @click="addCustomReminder"
                  class="mt-2"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Add Reminder Time
                </v-btn>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="cancelCustomReminders">Cancel</v-btn>
                <v-btn color="primary" :loading="savingCustom" @click="saveCustomReminders">Save</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Push Notifications Section -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-h6">Push Notifications</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item>
                  <v-switch
                    v-model="settings.TASK_UPDATE"
                    label="Task Updates"
                    details="Receive notifications for changes to priority, status, or description."
                    color="primary"
                    inset
                    hide-details
                  ></v-switch>
                </v-list-item>
                <v-list-item>
                  <v-switch
                    v-model="settings.TASK_REASSIGNMENT_ADD"
                    label="Task Assignments"
                    details="Receive a notification when you are assigned to a new task."
                    color="primary"
                    inset
                    hide-details
                  ></v-switch>
                </v-list-item>
                <v-list-item>
                  <v-switch
                    v-model="settings.TASK_REASSIGNMENT_REMOVE"
                    label="Task Removals"
                    details="Receive a notification when you are removed from a task."
                    color="primary"
                    inset
                    hide-details
                  ></v-switch>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </div>
        <div
          v-else
          class="text-center pa-4"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
          <p class="mt-2">
            Loading your settings...
          </p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="loading"
          @click="saveSettings"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notificationStore";

const timezones = ref([
  { title: 'UTC', value: 'UTC' },
  { title: 'Eastern Time', value: 'America/New_York' },
  { title: 'Pacific Time', value: 'America/Los_Angeles' },
  { title: 'Central European Time', value: 'Europe/Berlin' },
  // Add more as needed
]);

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const loading = ref(true); // For initial load
const saving = ref(false); // For save button action
const settings = ref({
  emailEnabled: true,
  emailReminderType: 'preset',
  emailPresetReminders: [1, 3, 7],
  emailCustomReminders: [],
  emailReassignmentAdd: true,
  emailReassignmentRemove: true,
  timezone: 'UTC',
  TASK_UPDATE: true,
  TASK_REASSIGNMENT_ADD: true,
  TASK_REASSIGNMENT_REMOVE: true,
});

const showAddReminderDialog = ref(false);
const showCustomDialog = ref(false);
const customReminders = ref([]);
const selectedPresetReminders = ref([1, 3, 7]);
const savingCustom = ref(false);

// Computed property for sorted custom reminders display
const sortedCustomReminders = computed(() => {
  return customReminders.value
    .map((reminder, index) => ({
      id: index,
      display: `${reminder.value} ${reminder.unit === 'days' ? (reminder.value > 1 ? 'days' : 'day') : (reminder.value > 1 ? 'hours' : 'hour')} before`,
      hours: reminder.unit === 'days' ? reminder.value * 24 : reminder.value
    }))
    .sort((a, b) => b.hours - a.hours); // Sort by hours descending (furthest first)
});

// A function to load settings once the user is known
async function loadUserSettings(email) {
  if (!email) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const userDocRef = doc(db, "users", email);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      // Get user data
      const userData = userDoc.data();

      // Set defaults first, then override with existing settings
      const defaultSettings = {
        TASK_UPDATE: true,
        TASK_REASSIGNMENT_ADD: true,
        TASK_REASSIGNMENT_REMOVE: true,
        emailEnabled: true,
        emailReminderType: 'preset',
        emailPresetReminders: [1, 3, 7],
        emailCustomReminders: [],
        emailReassignmentAdd: true,
        emailReassignmentRemove: true,
        timezone: 'UTC',
        pushEnabled: true
      };

      // Merge existing settings with defaults
      settings.value = { ...defaultSettings, ...(userData.notificationSettings || {}) };
      if (userData.timezone) {
        settings.value.timezone = userData.timezone;
      }

      // Initialize selectedPresetReminders based on loaded settings
      selectedPresetReminders.value = [...settings.value.emailPresetReminders];

      // Initialize customReminders if using custom type
      if (settings.value.emailReminderType === 'custom' && settings.value.emailCustomReminders) {
        customReminders.value = settings.value.emailCustomReminders.map(hours => {
          if (hours >= 24 && hours % 24 === 0) {
            return { value: hours / 24, unit: 'days' };
          } else {
            return { value: hours, unit: 'hours' };
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to load user settings:", error);
    notificationStore.addNotification({
      title: "Error",
      body: "Could not load your settings.",
    });
  } finally {
    loading.value = false;
  }
}

// Watch for the user's email to become available to prevent a race condition.
watch(() => authStore.userEmail, (newEmail) => {
  loadUserSettings(newEmail);
}, { immediate: true }); // immediate: true runs this once on component load

function openCustomDialog() {
  settings.value.emailReminderType = 'custom';
  // Initialize with current custom reminders if any, otherwise empty
  if (settings.value.emailCustomReminders && settings.value.emailCustomReminders.length > 0) {
    customReminders.value = settings.value.emailCustomReminders.map(hours => {
      if (hours >= 24 && hours % 24 === 0) {
        return { value: hours / 24, unit: 'days' };
      } else {
        return { value: hours, unit: 'hours' };
      }
    });
  } else {
    customReminders.value = [{ value: 1, unit: 'days' }];
  }
  showCustomDialog.value = true;

  // Save the reminder type change immediately
  saveReminderType();
}

async function saveReminderType() {
  const userEmail = authStore.userEmail;
  if (userEmail) {
    try {
      const userDocRef = doc(db, "users", userEmail);
      await setDoc(userDocRef, { notificationSettings: { emailReminderType: settings.value.emailReminderType } }, { merge: true });
    } catch (error) {
      // Silent fail for background reminder type saves
    }
  }
}

function switchToDefault() {
  settings.value.emailReminderType = 'preset';
  settings.value.emailPresetReminders = [1, 3, 7];
  settings.value.emailCustomReminders = [];
  customReminders.value = [];
  showAddReminderDialog.value = false; // Close the dialog immediately
  notificationStore.addNotification({
    title: "Success",
    body: "Switched back to default reminders.",
  });
}

function addCustomReminder() {
  customReminders.value.push({ value: 1, unit: 'days' }); // Default to 1 day
}

function removeCustomReminder(index) {
  customReminders.value.splice(index, 1);
}

async function saveCustomReminders() {
  savingCustom.value = true;

  // Convert to hours for backend storage
  const convertedReminders = customReminders.value.map(reminder => {
    return reminder.unit === 'days' ? reminder.value * 24 : reminder.value;
  });
  settings.value.emailCustomReminders = convertedReminders;

  // Save to Firebase immediately
  const userEmail = authStore.userEmail;
  if (userEmail) {
    try {
      const userDocRef = doc(db, "users", userEmail);
      await setDoc(userDocRef, { notificationSettings: settings.value }, { merge: true });
      showCustomDialog.value = false;
      notificationStore.addNotification({
        title: "Success",
        body: "Custom reminders have been updated.",
      });
    } catch (error) {
      console.error("Error saving custom reminders:", error);
      notificationStore.addNotification({
        title: "Error",
        body: "There was a problem saving your custom reminders.",
      });
    }
  }

  savingCustom.value = false;
}


function cancelCustomReminders() {
  // Revert to current saved custom reminders
  customReminders.value = settings.value.emailCustomReminders.map(hours => {
    if (hours >= 24 && hours % 24 === 0) {
      return { value: hours / 24, unit: 'days' };
    } else {
      return { value: hours, unit: 'hours' };
    }
  });
  showCustomDialog.value = false;
}

// Watch for preset changes
watch(selectedPresetReminders, (newVal) => {
  if (settings.value.emailReminderType === 'preset') {
    settings.value.emailPresetReminders = [...newVal];
  }
});

// Initialize custom reminders when dialog opens
watch(showCustomDialog, (newVal) => {
  if (newVal && settings.value.emailCustomReminders) {
    // Convert from hours back to value/unit format for editing
    customReminders.value = settings.value.emailCustomReminders.map(hours => {
      if (hours >= 24 && hours % 24 === 0) {
        return { value: hours / 24, unit: 'days' };
      } else {
        return { value: hours, unit: 'hours' };
      }
    });
  }
});

async function saveSettings() {
  saving.value = true;
  const userEmail = authStore.userEmail;
  if (!userEmail) {
    notificationStore.addNotification({
      title: "Error",
      body: "Could not save settings. You might be logged out.",
    });
    saving.value = false;
    return;
  }
  try {
    const userDocRef = doc(db, "users", userEmail);
    await setDoc(userDocRef, { notificationSettings: settings.value }, { merge: true });
    notificationStore.addNotification({
      title: "Success",
      body: "Your notification settings have been saved.",
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    notificationStore.addNotification({
      title: "Error",
      body: "There was a problem saving your settings.",
    });
  } finally {
    saving.value = false;
  }
}
</script>

