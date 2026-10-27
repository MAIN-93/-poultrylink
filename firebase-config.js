/* =========================================================
   POULTRYLINK — FIREBASE CONFIGURATION
   Firebase JavaScript SDK v11.10.0
========================================================= */

import { initializeApp, getApp, getApps } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { getStorage } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUBwgGhDHj-v6kBE5Dn3O_FxF8EfPPfy4",
  authDomain: "poultrylink-2459a.firebaseapp.com",
  projectId: "poultrylink-2459a",
  storageBucket: "poultrylink-2459a.firebasestorage.app",
  messagingSenderId: "332920290687",
  appId: "1:332920290687:web:3e71c648817e1c07ba6e4a"
};

// Reuse the existing app if one has already been initialized.
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export services for the rest of POULTRYLINK.
export { app, auth, db, storage };
