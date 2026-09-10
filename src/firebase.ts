import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: "AIzaSyCRM9SXoU2IWM0olulbyfAF2oeeGyJsygY",
  authDomain: "curtain-app-3d38a.firebaseapp.com",
  projectId: "curtain-app-3d38a",
  storageBucket: "curtain-app-3d38a.firebasestorage.app",
  messagingSenderId: "58897117944",
  appId: "1:58897117944:web:3b7aa0417af8bc99a4010d"
};

// Initialize Firebase with permanent app domain config
export const app = getApps().length === 0 ? initializeApp(defaultFirebaseConfig) : getApp();
export const auth = getAuth(app);

// Use experimentalForceLongPolling to resolve:
// "@firebase/firestore: Could not reach Cloud Firestore backend. Connection failed 1 times. [code=unavailable]"
// In iframe sandboxes and proxy environments, WebChannel streaming gets blocked or buffered indefinitely,
// whereas long polling enables reliable HTTP request-response communication.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const appId = "curtain-app-3d38a";
