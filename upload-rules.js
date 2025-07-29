// Upload Firestore rules script
// To use this script:
// 1. Install Firebase CLI if you haven't already: npm install -g firebase-tools
// 2. Login to Firebase: firebase login
// 3. Set your project: firebase use your-project-id
// 4. Run this script: node upload-rules.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Starting Firebase rules upload...");

try {
    // Check if firebase CLI is installed
    try {
        execSync('firebase --version', { stdio: 'inherit' });
        console.log("Firebase CLI detected!");
    } catch (e) {
        console.error("Firebase CLI not found. Please install it with 'npm install -g firebase-tools'");
        process.exit(1);
    }

    // Check if the rules file exists
    const rulesPath = path.join(__dirname, 'firestore.rules');
    if (!fs.existsSync(rulesPath)) {
        console.error("firestore.rules file not found!");
        process.exit(1);
    }

    // Upload the rules
    console.log("Uploading Firestore rules...");
    execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });

    console.log("Rules upload completed successfully!");
} catch (error) {
    console.error("Error during rules upload:", error.message);
    process.exit(1);
}
