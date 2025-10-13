import { messaging, getToken, onMessage } from '../config/firebase';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notificationStore';

export async function initNotifications() {
    try {
        // Check browser support
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications.');
            return;
        }

        // Check permission
        if (Notification.permission === 'denied') {
            console.warn('User has blocked notifications.');
            return;
        }

        const authStore = useAuthStore();
        const currentUserId = authStore.user.email; // dynamic user ID
        if (!currentUserId) return;

        // Ask for permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await getToken(messaging, {
            vapidKey: 'BOZVEiXTmivbb26FmxdVZNllDVnLHpwP7Nx2_vox2Yv7kaWyR1rh8lsZsG2Vs9uWEkh9Ki3YjeGQ6phnMBHkY78',
            serviceWorkerRegistration: swRegistration
        });

        console.log('FCM Token:', token);

        // Save token
        console.log('Saving new FCM token for user...');
        await fetch('http://localhost:3000/api/fcm/save-fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, fcmToken: token })
        });
        console.log('✅ FCM token saved successfully');

        // Listen for foreground notifications
        onMessage(messaging, (payload) => {
            console.log('Message received:', payload);
            const notificationStore = useNotificationStore();
            // Use consistent object keys
            notificationStore.addNotification({
                title: payload.notification?.title,
                body: payload.notification?.body
            });
        });

    } catch (err) {
        console.error('Error initializing notifications:', err);
    }
}

