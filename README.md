# RBAC Hotel Feedback System

A role-based access control (RBAC) web application for hotel guest feedback management built with HTML, CSS, JavaScript, and Firebase. This system allows SuperAdmins to create Admin accounts with hotel-specific branding, and enables real-time guest feedback collection with conditional logic.

## System Overview

### User Roles

- **SuperAdmin**: Creates and manages Admin accounts, assigns hotel details
- **Admin**: Manages hotel-specific guest feedback forms with custom branding

### Core Functionality

1. SuperAdmin creates Admin accounts with hotel details (name, image, description)
2. Admin logs in with provided credentials
3. Admin dashboard displays assigned hotel information
4. Branded guest feedback form with conditional logic ("Is everything okay?" → Yes/No branching)
5. Real-time feedback collection and storage

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Authentication, Firestore Database
- **Hosting**: Firebase Hosting

## File Structure

```
project/
├── index.html                    # Login page (SuperAdmin & Admin)
├── superadmin-dashboard.html     # SuperAdmin management interface
├── admin-dashboard.html          # Admin hotel info and feedback form
├── css/
│   └── style.css                # Main stylesheet
├── js/
│   ├── config.js                # Firebase configuration
│   ├── firebase-init.js         # Firebase initialization
│   └── app.js                   # Main application logic
├── images/
│   └── hotel-logo.png           # Default hotel logo
├── firestore.rules              # Database security rules
└── firebase.json                # Firebase configuration
```

## Database Schema (Firestore)

### Collections

#### `superadmins`

```javascript
{
  uid: {
    email: "superadmin@example.com",
    role: "superadmin",
    createdAt: timestamp
  }
}
```

#### `admins`

```javascript
{
  uid: {
    email: "admin@hotel.com",
    role: "admin",
    hotelName: "Grand Palace Hotel",
    hotelImageURL: "https://example.com/hotel-image.jpg",
    hotelDescription: "Luxury hotel in downtown area with premium amenities",
    createdBy: "superAdminUID",
    createdAt: timestamp
  }
}
```

#### `feedback`

```javascript
{
  feedbackId: {
    adminUID: "admin-user-id",
    hotelName: "Grand Palace Hotel",
    guestRoom: "312",
    isEverythingOkay: false,
    issues: {
      roomCleanliness: "poor",
      amenities: "broken_ac",
      staffBehavior: "rude",
      otherIssues: "loud noise"
    },
    submittedAt: timestamp
  }
}
```

## Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // SuperAdmin access
    match /superadmins/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Admin access - can read their own data
    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/superadmins/$(request.auth.uid));
    }

    // Feedback access - admins can read their hotel's feedback
    match /feedback/{feedbackId} {
      allow create: if true; // Allow guests to submit feedback
      allow read: if request.auth != null &&
        (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
         exists(/databases/$(database)/documents/superadmins/$(request.auth.uid)));
    }
  }
}
```

## User Interface Requirements

### 1. Login Page (`index.html`)

- Clean, professional login form
- Email and password fields
- "Login" button
- Responsive design
- Automatic role detection and redirection

### 2. SuperAdmin Dashboard (`superadmin-dashboard.html`)

**Features:**

- Header: "SuperAdmin Dashboard"
- Create Admin section with form:
  - Admin Email (input)
  - Generated Password (display/copy)
  - Hotel Name (input)
  - Hotel Image URL (input)
  - Hotel Description (textarea)
  - "Create Admin" button
- List of created admins with hotel details
- Logout button

### 3. Admin Dashboard (`admin-dashboard.html`)

**Features:**

- Header: Display hotel name
- Hotel Information Section:
  - Hotel image (responsive)
  - Hotel name (large heading)
  - Hotel description (paragraph)
- Guest Feedback Form Section:
  - "Guest Feedback Form" heading
  - Room number input
  - Primary question: "Is everything okay with your stay?"
  - Yes/No radio buttons
  - Conditional follow-up questions (shown only if "No" selected):
    - Room cleanliness issues (dropdown)
    - Amenities problems (dropdown)
    - Staff behavior (dropdown)
    - Other issues (textarea)
  - Submit button
  - Thank you message display
- Feedback History Section:
  - List of submitted feedback
  - Filter options
- Logout button

## Conditional Logic Implementation

### Guest Feedback Form Logic

```javascript
// Primary question branching
if (isEverythingOkay === "yes") {
  displayThankYouMessage();
  hideFollowUpQuestions();
} else if (isEverythingOkay === "no") {
  showFollowUpQuestions();
  enableSubmitButton();
}

// Follow-up questions
const followUpQuestions = {
  roomCleanliness: ["excellent", "good", "fair", "poor", "very poor"],
  amenities: [
    "all working",
    "minor issues",
    "broken AC",
    "no hot water",
    "other",
  ],
  staffBehavior: ["excellent", "good", "fair", "rude", "unprofessional"],
  otherIssues: "text area for additional comments",
};
```

## Authentication Flow

### SuperAdmin Flow

1. Login with SuperAdmin credentials
2. Redirect to SuperAdmin dashboard
3. Create Admin accounts with hotel details
4. Provide credentials to hotel staff

### Admin Flow

1. Login with provided credentials
2. Redirect to Admin dashboard
3. View assigned hotel information
4. Access branded guest feedback form
5. View submitted feedback

## CSS Styling Requirements

### Design Principles

- Clean, modern interface
- Mobile-first responsive design
- Professional color scheme
- Clear typography hierarchy
- Intuitive navigation

### Key Styling Elements

```css
/* Color Scheme */
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --success-color: #27ae60;
  --background-color: #ecf0f1;
  --text-color: #2c3e50;
  --border-color: #bdc3c7;
}

/* Typography */
body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
}

/* Responsive Design */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
}
```

## JavaScript Functionality Requirements

### Core Functions Needed

#### Authentication (`app.js`)

```javascript
// Login function
async function login(email, password) {
  // Firebase authentication
  // Role detection
  // Redirect based on role
}

// Logout function
function logout() {
  // Sign out from Firebase
  // Redirect to login page
}

// Check authentication state
function checkAuthState() {
  // Monitor auth state changes
  // Redirect unauthorized users
}
```

#### SuperAdmin Functions

```javascript
// Create admin account
async function createAdmin(adminData) {
  // Create Firebase user
  // Store admin data in Firestore
  // Generate secure password
}

// List all admins
async function loadAdmins() {
  // Fetch admins from Firestore
  // Display in dashboard
}
```

#### Admin Functions

```javascript
// Load hotel information
async function loadHotelInfo() {
  // Fetch admin's hotel data
  // Display hotel details
}

// Handle feedback form
function handleFeedbackForm() {
  // Implement conditional logic
  // Submit to Firestore
  // Show confirmation
}

// Load feedback history
async function loadFeedbackHistory() {
  // Fetch feedback for admin's hotel
  // Display in table format
}
```

## Firebase Configuration

### Required Firebase Services

- Authentication (Email/Password)
- Firestore Database
- Hosting (optional)

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

## Implementation Steps

### Phase 1: Basic Structure

1. Create HTML files with proper structure
2. Implement basic CSS styling
3. Set up Firebase configuration
4. Implement authentication system

### Phase 2: Core Functionality

1. SuperAdmin dashboard with admin creation
2. Admin dashboard with hotel information display
3. Guest feedback form with conditional logic
4. Data storage in Firestore

### Phase 3: Enhancement

1. Feedback history display
2. Form validation and error handling
3. Responsive design improvements
4. User experience enhancements

## Security Considerations

### Frontend Security

- Input validation on all forms
- XSS prevention
- Secure credential handling

### Firebase Security

- Proper Firestore security rules
- Authentication state verification
- Role-based access control

## Testing Requirements

### Functionality Testing

- SuperAdmin can create admins
- Admin login and dashboard access
- Feedback form conditional logic
- Data persistence in Firestore

### UI/UX Testing

- Responsive design on mobile devices
- Form usability and validation
- Clear navigation and messaging

## Deployment Checklist

- [ ] Firebase project configured
- [ ] Authentication enabled
- [ ] Firestore rules deployed
- [ ] SuperAdmin account created
- [ ] Application tested end-to-end
- [ ] Responsive design verified
- [ ] Security rules validated

## Success Metrics

### Functional Requirements Met

- SuperAdmin can create and manage admins ✓
- Admins can login and view hotel information ✓
- Guest feedback form works with conditional logic ✓
- Data is properly stored and secured ✓
- Interface is responsive and user-friendly ✓

This README provides complete specifications for building a professional RBAC hotel feedback system. The MCP Agent should implement all features as described, ensuring clean code, proper security, and excellent user experience.
