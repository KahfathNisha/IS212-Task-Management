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

              <v-text-field
                v-model.number="settings.emailLeadTime"
                label="Lead Time (hours before deadline)"
                type="number"
                :disabled="!settings.emailEnabled"
                :rules="[v => v > 0 || 'Must be greater than 0']"
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model.number="settings.emailFrequency"
                label="Reminder Frequency (hours)"
                type="number"
                :disabled="!settings.emailEnabled"
                :rules="[v => v > 0 || 'Must be greater than 0']"
                class="mb-4"
              ></v-text-field>

              <v-select
                v-model="settings.timezone"
                :items="timezones"
                label="Timezone"
                :disabled="!settings.emailEnabled"
              ></v-select>
            </v-card-text>
          </v-card>

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
import { ref, watch } from "vue";
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
  emailLeadTime: 24,
  emailFrequency: 6,
  timezone: 'UTC',
  TASK_UPDATE: true,
  TASK_REASSIGNMENT_ADD: true,
  TASK_REASSIGNMENT_REMOVE: true,
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
        emailLeadTime: 24,
        emailFrequency: 6,
        timezone: 'UTC',
        pushEnabled: true
      };

      // Merge existing settings with defaults
      settings.value = { ...defaultSettings, ...(userData.notificationSettings || {}) };
      if (userData.timezone) {
        settings.value.timezone = userData.timezone;
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

