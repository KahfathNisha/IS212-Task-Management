import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCY2S4NyCq_gNNlSRCJgCpX2zW4-z9wNjA",
  authDomain: "is212-task-management.firebaseapp.com",
  projectId: "is212-task-management",
  storageBucket: "is212-task-management.firebasestorage.app",
  messagingSenderId: "320036814196",
  appId: "1:320036814196:web:80392adc43882a0b4a8021",
  measurementId: "G-3CFDCZE7PG"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);