// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDG2W0KOMdNxu-o0wX7wrJFVnEn6rWtyUM",
    authDomain: "guestpulse-87c8d.firebaseapp.com",
    projectId: "guestpulse-87c8d",
    storageBucket: "guestpulse-87c8d.firebasestorage.app",
    messagingSenderId: "78471484531",
    appId: "1:78471484531:web:6f318b5a9ce28d6db5c606"
};

// Initialize Firebase
console.log("Initializing Firebase...");
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Initialize Firebase services
let auth, db, superAdminsRef, adminsRef, feedbackRef;

try {
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Collection references
    superAdminsRef = db.collection('superadmins');
    adminsRef = db.collection('admins');
    feedbackRef = db.collection('feedback');
    
    console.log("Firebase services initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase services:", error);
}

// App configuration
const appConfig = {
    roles: {
        SUPERADMIN: 'superadmin',
        ADMIN: 'admin'
    },
    
    // Default SuperAdmin credentials (for initial setup)
    defaultSuperAdmin: {
        email: 'superadmin@hotelrbac.com',
        password: 'SuperAdmin123!'
    }
};

console.log("Firebase configuration loaded");
