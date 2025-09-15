# Team Firebase Setup

## Firebase Access
Everyone has been added to the Firebase project. Check your email for the invitation.

## Firebase Console
- URL: https://console.firebase.google.com
- Project: is212-task-management
- Region: asia-southeast1

## Shared Configuration
The Firebase config is already in `frontend/src/config/firebase.js`
No need to change anything - just pull the latest code.

## Firestore Collections Structure
- users/
- tasks/
- projects/
- notifications/
- reports/

## Testing with Emulators
For local testing without affecting production:
```bash
cd backend
firebase emulators:start