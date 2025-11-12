// Firebase configuration
let database: any = null;
let app: any = null;

try {
  const { initializeApp } = require("firebase/app");
  const { getDatabase } = require("firebase/database");

  const firebaseConfig = {
    apiKey: "AIzaSyBFdWSm6KnVeyRzXOKPTns13az8Sbu0Zhg",
    authDomain: "ktien-fb310.firebaseapp.com",
    projectId: "ktien-fb310",
    storageBucket: "ktien-fb310.firebasestorage.app",
    messagingSenderId: "804107717513",
    appId: "1:804107717513:web:1cc89339ef13f2b4e0ef58",
    measurementId: "G-ZSPS45K4SZ",
    databaseURL: "https://ktien-fb310-default-rtdb.firebaseio.com",
  };

  // Initialize Firebase
  app = initializeApp(firebaseConfig, "36LearningApp");

  // Initialize Realtime Database
  database = getDatabase(app);
  
  console.log("Firebase initialized successfully");
} catch (error: any) {
  console.error("Firebase initialization error:", error);
  console.error("Error details:", error?.message, error?.code);
}

export { database, app };
export default app;

