import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((err) => {
      console.error("Service Worker registration failed:", err);
    });
}

const firebaseConfig = {
  apiKey: "AIzaSyC3CghJXmKj3-VcWBLzMAbzb2JccTeDH4g",
  authDomain: "community-life-2b8ve.firebaseapp.com",
  projectId: "community-life-2b8ve",
  storageBucket: "community-life-2b8ve.firebasestorage.app",
  messagingSenderId: "626015749804",
  appId: "1:626015749804:web:da2ac3e3ef35a9db9b0109"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let messaging = null

try {
  //messaging = getMessaging(app);
  
} catch (error) {
  console.log('ERROR ', error)
  alert(error)
}



// Initialize Firestore

export { messaging, db, getToken, onMessage };