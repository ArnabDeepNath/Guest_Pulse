# RBAC Hotel Feedback Web Application

A role-based access control (RBAC) web application for hotel guest feedback management, built with HTML, CSS, JavaScript, and Firebase. This system implements the **GuestPulse LIVE** feedback concept with hierarchical user management.

## System Architecture

### User Roles & Permissions

**SuperAdmin**

- Create and manage Admin accounts via Firebase Authentication
- Assign hotel details (name, image, description) to each Admin
- Full system access and user management capabilities

**Admin**

- Login using credentials provided by SuperAdmin
- View assigned hotel information (name, image, description)
- Access branded guest feedback form with conditional logic
- Manage guest feedback submissions for their specific hotel

## Core Features

### Authentication System

- Firebase Authentication with email/password
- Role-based access control (SuperAdmin vs Admin)
- Secure credential management and assignment

### Hotel Management

- SuperAdmin assigns unique hotel branding per Admin
- Hotel data includes: name, image URL, description
- Data stored in Firebase Firestore linked to Admin UIDs

### Guest Feedback Form (GuestPulse LIVE Implementation)

Based on the attached reference document, the form includes:

**Initial Question:** "Is everything okay with your stay?"

- **Yes Response:** Display thank you message and end survey
- **No Response:** Trigger follow-up conditional questions:
  - Room cleanliness issues
  - Amenities problems
  - Staff behavior concerns
  - Other specific hotel service issues

**Form Features:**

- Mobile-first, responsive design
- Hotel branding integration (logo, colors, fonts)
- Logic-based conditional question flow
- Real-time negative feedback alerting
- QR code accessibility for guest rooms

### Alert System

- Real-time notifications for negative guest feedback
- Integration options:
  - Firebase Cloud Functions for backend triggers
  - Zapier/Make automation for email/SMS alerts
- Immediate staff notification for issue resolution

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Firebase Authentication, Firestore Database
- **Optional:** Firebase Cloud Functions for advanced alerting
- **Hosting:** Firebase Hosting
- **Automation:** Zapier/Make integration capabilities

## Project Structure

```
/public
  /css
    styles.css              # Main stylesheet for all pages
    mobile.css              # Mobile-specific styles
  /js
    auth.js                 # Authentication logic
    superadmin-dashboard.js # SuperAdmin user management
    admin-panel.js          # Admin hotel info and form logic
    feedback-form.js        # Guest feedback form with conditional logic
    alerts.js              # Alert system integration
  /images
    default-hotel-logo.png  # Fallback hotel image

  index.html                # Login page (SuperAdmin & Admin)
  superadmin-dashboard.html # SuperAdmin management interface
  admin-panel.html          # Admin hotel info display + feedback form

/firebase
  functions/
    index.js               # Cloud Functions for alerts (optional)

firebase.json              # Firebase configuration
.firebaserc               # Firebase project settings
firestore.rules           # Database security rules
storage.rules             # Storage security rules (if needed)
```

## Database Schema (Firestore)

### Collections

**admins**

```javascript
{
  adminUID: {
    email: "admin@hotel.com",
    role: "admin",
    hotelName: "Grand Palace Hotel",
    hotelImageURL: "https://example.com/hotel-image.jpg",
    hotelDescription: "Luxury hotel in downtown...",
    createdBy: "superAdminUID",
    createdAt: timestamp
  }
}
```

**feedback**

```javascript
{
  feedbackID: {
    adminUID: "admin-user-id",
    hotelName: "Grand Palace Hotel",
    guestRoom: "312",
    isEverythingOkay: false,
    issues: {
      roomCleanliness: "poor",
      amenities: "broken_ac",
      staffBehavior: "good"
    },
    alertTriggered: true,
    submittedAt: timestamp,
    resolved: false
  }
}
```

**superadmins**

```javascript
{
  superAdminUID: {
    email: "superadmin@system.com",
    role: "superadmin",
    createdAt: timestamp
  }
}
```

## Security Rules (Firestore)

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

    // Feedback access
    match /feedback/{feedbackId} {
      allow write: if request.auth != null;
      allow read: if request.auth != null &&
        (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
         exists(/databases/$(database)/documents/superadmins/$(request.auth.uid)));
    }
  }
}
```

## User Workflows

### SuperAdmin Workflow

1. Login at `index.html` with SuperAdmin credentials
2. Access `superadmin-dashboard.html`
3. Create new Admin account:
   - Enter Admin email and generate password
   - Input hotel details (name, image URL, description)
   - Save to Firebase (creates user + stores hotel data)
4. Provide Admin with login credentials

### Admin Workflow

1. Login at `index.html` with provided credentials
2. System redirects to `admin-panel.html`
3. Page displays assigned hotel information:
   - Hotel name as page header
   - Hotel image/logo
   - Hotel description
4. Guest feedback form loads with hotel branding
5. Form implements GuestPulse LIVE logic:
   - "Is everything okay?" → Yes/No branching
   - Conditional follow-up questions on "No"
   - Submit triggers alert system if negative feedback

## GuestPulse LIVE Integration Features

### Mobile-Optimized Form

- Responsive design for smartphone access
- Touch-friendly interface elements
- Fast loading and minimal data usage

### Conditional Logic Implementation

```javascript
// Example form logic structure
if (isEverythingOkay === "no") {
  showFollowUpQuestions([
    "roomCleanliness",
    "amenities",
    "staffBehavior",
    "otherIssues",
  ]);

  // Trigger alert system
  triggerStaffAlert({
    hotelName: adminData.hotelName,
    issues: collectedIssues,
    timestamp: new Date(),
    priority: "immediate",
  });
}
```

### Alert System Options

**Option 1: Firebase Cloud Functions**

```javascript
exports.sendFeedbackAlert = functions.firestore
  .document("feedback/{feedbackId}")
  .onCreate((snap, context) => {
    const feedback = snap.data();
    if (!feedback.isEverythingOkay) {
      // Send email/SMS alert to hotel staff
      return sendAlert(feedback);
    }
  });
```

**Option 2: Zapier/Make Integration**

- Webhook trigger on negative feedback submission
- Automated email/SMS to hotel management
- Integration with hotel management systems

### QR Code Generation

- Generate unique QR codes linking to each Admin's feedback form
- Include hotel logo in QR code design (optional)
- Provide printable QR codes for guest room placement

## Setup Instructions

### 1. Firebase Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize project
firebase login
firebase init

# Select: Authentication, Firestore, Hosting, Functions (optional)
```

### 2. Authentication Setup

- Enable Email/Password authentication in Firebase Console
- Create first SuperAdmin user manually or via Firebase Admin SDK

### 3. Deploy Application

```bash
# Deploy to Firebase Hosting
firebase deploy

# Deploy functions (if using Cloud Functions)
firebase deploy --only functions
```

### 4. Environment Configuration

Create Firebase config object in your JavaScript files:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};

firebase.initializeApp(firebaseConfig);
```

## Alert System Configuration

### Email Alerts (Example)

Subject: ⚠️ Guest Feedback Alert – Immediate Attention Needed

Body Template:

```
A guest submitted feedback indicating issues with their stay.

Hotel: {hotelName}
Room: {roomNumber}
Issues Reported: {issuesList}
Submitted: {timestamp}

Please address immediately and follow up with the guest.

View full feedback: {dashboardLink}
```

### SMS Alert Template

```
🏨 GUEST ALERT: Issues reported at {hotelName}, Room {roomNumber}.
Issues: {briefIssuesList}.
Check dashboard immediately.
```

## Customization Guide

### Hotel Branding

- Upload hotel logos to Firebase Storage or use external URLs
- Customize CSS variables for brand colors:

```css
:root {
  --hotel-primary-color: #your-color;
  --hotel-secondary-color: #your-color;
  --hotel-font-family: "Your-Font", sans-serif;
}
```

### Form Customization

- Modify conditional questions in `feedback-form.js`
- Add hotel-specific service categories
- Customize thank you messages and alert thresholds

## Deployment Checklist

- [ ] Firebase project created and configured
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created with proper security rules
- [ ] SuperAdmin account created
- [ ] Application deployed to Firebase Hosting
- [ ] Alert system configured (Cloud Functions or Zapier/Make)
- [ ] QR codes generated for initial hotel
- [ ] Staff training completed on alert response

## Future Enhancements

### Phase 2 Features

- Analytics dashboard for feedback trends
- Bulk Admin creation and CSV import
- Advanced reporting and guest satisfaction metrics
- Integration with hotel PMS systems
- Multi-language support for international hotels

### Technical Improvements

- Progressive Web App (PWA) capabilities
- Offline form submission with sync
- Advanced security with rate limiting
- Automated backup and disaster recovery

## Support and Maintenance

### Regular Tasks

- Monitor alert system functionality
- Update Firebase security rules as needed
- Review and optimize database queries
- Update hotel branding and information
- Generate new QR codes when needed

### Troubleshooting

- Check Firebase Console for authentication errors
- Verify Firestore security rules for access issues
- Test alert system regularly to ensure delivery
- Monitor form submission success rates

## Quick Start Commands

```bash
# Clone and setup
git clone
cd rbac-hotel-feedback

# Install dependencies and deploy
npm install
firebase login
firebase init
firebase deploy

# Create first SuperAdmin (run once)
node scripts/create-superadmin.js
```

This README provides comprehensive guidance for implementing the RBAC hotel feedback system with GuestPulse LIVE integration. The system enables hotels to proactively address guest concerns through real-time feedback collection and alerting, ultimately protecting their online reputation and improving guest satisfaction.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/81661707/29ab6068-e159-46e1-8938-297772549707/GuestPulse-LIVE_-In-Stay-Real-Time-Guest-Feedback-System-1.pdf
