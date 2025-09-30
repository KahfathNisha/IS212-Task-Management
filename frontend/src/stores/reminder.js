import { messaging, getToken, onMessage } from '../config/firebase';
import { useAuthStore } from '@/stores/auth';

export async function initNotifications() {
    try {
        const authStore = useAuthStore();
        const currentUserId = authStore.user.email; // dynamic user ID
        if (!currentUserId) return;

        // Future consideration: if user does not grant permission we cannot send notifications, so not sure if we wanna make them accept before they can proceed..?
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        // vapid key taken from Firebase Cloud Messaging settings!! (Project Settings > Cloud Messaging > Web Push certificates)
        const token = await getToken(messaging, {
            vapidKey: 'BOZVEiXTmivbb26FmxdVZNllDVnLHpwP7Nx2_vox2Yv7kaWyR1rh8lsZsG2Vs9uWEkh9Ki3YjeGQ6phnMBHkY78',
            serviceWorkerRegistration: swRegistration
        });

        console.log('FCM Token:', token);

        // Save token dynamically for the logged-in user
        // const response = await fetch(`http://localhost:3000/api/users/${currentUserId}`);
        // if (!response.ok) throw new Error('Failed to fetch user document');
        // const userDoc = await response.json();

        // Only save token if it's different or missing
        // if (!userDoc.fcmToken || userDoc.fcmToken !== token) {
            console.log('Saving new FCM token for user...');
            await fetch('http://localhost:3000/api/fcm/save-fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, fcmToken: token })
            });
            console.log('✅ FCM token saved successfully');
        // } else {
        //     console.log('FCM token is up-to-date, no update needed');
        // }
        // await fetch('http://localhost:3000/api/fcm/save-fcm-token', {
        // method: 'POST',
        // headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ 
        //     userId: currentUserId, 
        //     fcmToken: token })
        // });

        // Listen for foreground notifications
        onMessage(messaging, (payload) => {
        console.log('Message received:', payload);
        alert(payload.notification.body); // or show a toast
        });

    } catch (err) {
        console.error('Error initializing notifications:', err);
    }
}
