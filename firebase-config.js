// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC1VIO3lEU6v0ZOT5E3NQ282oAmPq0In5I",
  authDomain: "circademic-new.firebaseapp.com",
  projectId: "circademic-new",
  storageBucket: "circademic-new.firebasestorage.app",
  messagingSenderId: "939215029590",
  appId: "1:939215029590:web:0ad25e04fd53a0c82302f7",
  measurementId: "G-3MV8RP9TTJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
