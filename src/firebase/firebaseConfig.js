import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqowVnkUXzjgutGHRKKptEm5NjCl7C4yQ",
  authDomain: "studygenie-691e5.firebaseapp.com",
  projectId: "studygenie-691e5",
  storageBucket: "studygenie-691e5.firebasestorage.app",
  messagingSenderId: "524154104312",
  appId: "1:524154104312:web:bc5f8b1d46ce9ee6e8ce0d",
  measurementId: "G-BVLGXPV56E"
};

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.log("Firebase init skipped (local mode)");
}

export { app, auth, db };
