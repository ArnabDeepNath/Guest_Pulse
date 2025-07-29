# RBAC Hotel Feedback System - Implementation

A complete role-based access control (RBAC) web application for hotel guest feedback management built with HTML, CSS, JavaScript, and Firebase.

## 🚀 Quick Start

### 1. System Setup

First, initialize the system by creating the SuperAdmin account:

1. Open `setup.html` in your browser
2. The system will automatically create the default SuperAdmin account
3. Note down the credentials provided

### 2. Default SuperAdmin Credentials

- **Email:** `superadmin@hotelrbac.com`
- **Password:** `SuperAdmin123!`
- ⚠️ **Important:** Change this password after first login!

### 3. Access the System

1. Open `index.html` to access the login page
2. Login with the SuperAdmin credentials
3. You'll be redirected to the SuperAdmin dashboard

## 📁 File Structure

```
project/
├── index.html                    # Login page
├── setup.html                   # System initialization page
├── superadmin-dashboard.html     # SuperAdmin management interface
├── admin-dashboard.html          # Admin hotel dashboard
├── guest-feedback.html          # Guest feedback form
├── css/
│   └── style.css                # Complete stylesheet
├── js/
│   ├── firebase-config.js       # Firebase configuration
│   ├── auth.js                  # Authentication management
│   ├── superadmin.js           # SuperAdmin functionality
│   ├── admin.js                # Admin dashboard functionality
│   ├── guest.js                # Guest feedback functionality
│   └── setup.js                # System setup utilities
├── images/
│   └── hotel-logo.png          # Default hotel logo
├── firestore.rules             # Database security rules
└── README.md                   # This file
```

## 🔑 User Roles & Access

### SuperAdmin

- **Access:** SuperAdmin Dashboard (`superadmin-dashboard.html`)
- **Capabilities:**
  - Create Admin accounts with hotel details
  - Generate secure passwords for Admins
  - View all created Admin accounts
  - Manage hotel information

### Admin (Hotel Staff)

- **Access:** Admin Dashboard (`admin-dashboard.html`)
- **Capabilities:**
  - View assigned hotel information
  - Access branded guest feedback form
  - Generate guest feedback links
  - View feedback history and analytics
  - Filter feedback by type (issues/positive)

### Guest

- **Access:** Guest Feedback Form (`guest-feedback.html?hotel=ADMIN_UID`)
- **Capabilities:**
  - Submit feedback without authentication
  - Conditional form logic (Yes/No branching)
  - Report specific issues if needed

## 🛠 How to Use

### For SuperAdmins

1. **Login:** Use the credentials provided during setup
2. **Create Admin Accounts:**

   - Fill in admin email
   - Click "Generate" for a secure password
   - Enter hotel name, image URL, and description
   - Click "Create Admin"
   - Copy the generated password to provide to hotel staff

3. **Manage Admins:**
   - View all created admin accounts
   - See hotel details and creation dates
   - Use "Refresh" to update the list

### For Admins (Hotel Staff)

1. **Login:** Use credentials provided by SuperAdmin
2. **View Hotel Info:** See your hotel's branding and details
3. **Guest Feedback Form:**

   - Copy the feedback link to share with guests
   - Test the form using the demo section
   - View conditional logic in action

4. **Feedback Management:**
   - View all submitted feedback
   - Filter by feedback type
   - See detailed issue reports
   - Monitor guest satisfaction

### For Guests

1. **Access:** Use the feedback link provided by hotel staff
2. **Submit Feedback:**
   - Enter room number
   - Answer "Is everything okay?"
   - If "Yes" → Thank you message
   - If "No" → Additional questions about specific issues
   - Submit feedback

## 🔧 Conditional Logic

The system implements smart conditional logic:

- **Primary Question:** "Is everything okay with your stay?"
- **If YES:**
  - Show thank you message
  - Hide follow-up questions
  - Submit positive feedback
- **If NO:**
  - Show follow-up questions
  - Collect specific issue details:
    - Room cleanliness rating
    - Amenities problems
    - Staff behavior rating
    - Additional comments
  - Submit detailed issue report

## 🗄 Database Structure

### Collections

#### `superadmins`

```javascript
{
  uid: {
    email: "superadmin@hotelrbac.com",
    role: "superadmin",
    createdAt: timestamp,
    isActive: true
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
    hotelImageURL: "https://example.com/image.jpg",
    hotelDescription: "Luxury hotel description",
    createdBy: "superAdminUID",
    createdAt: timestamp,
    isActive: true
  }
}
```

#### `feedback`

```javascript
{
  feedbackId: {
    adminUID: "admin-uid",
    hotelName: "Grand Palace Hotel",
    guestRoom: "312",
    isEverythingOkay: false,
    issues: {
      roomCleanliness: "poor",
      amenities: "broken_ac",
      staffBehavior: "good",
      otherIssues: "Noise from next room"
    },
    submittedAt: timestamp
  }
}
```

## 🔒 Security Features

- **Firebase Authentication:** Secure user management
- **Firestore Security Rules:** Role-based data access
- **Guest Access:** No authentication required for feedback
- **Data Integrity:** Feedback cannot be modified after submission
- **Input Validation:** All forms include proper validation
- **XSS Protection:** Secure data handling

## 🎨 Features

### Design

- **Responsive Design:** Works on all devices
- **Modern UI:** Clean, professional interface
- **Intuitive Navigation:** Easy-to-use dashboards
- **Loading States:** Visual feedback for all actions
- **Error Handling:** Comprehensive error messages

### Functionality

- **Role-Based Access Control (RBAC):** Proper access control
- **Real-time Data:** Live feedback updates
- **Conditional Forms:** Smart form logic
- **Password Generation:** Secure password creation
- **Link Sharing:** Easy guest feedback access
- **Feedback Analytics:** View and filter feedback

## 🐛 Troubleshooting

### Common Issues

1. **"Access denied" error:**

   - Ensure you're using the correct login credentials
   - Check that the user role is properly set

2. **Feedback form not loading:**

   - Verify the hotel ID in the URL parameter
   - Check that the admin account exists

3. **Can't create admin accounts:**

   - Ensure you're logged in as SuperAdmin
   - Check Firebase console for any errors

4. **Firebase connection issues:**
   - Verify Firebase config in `js/firebase-config.js`
   - Check browser console for errors

### Setup Issues

If setup fails:

1. Visit `setup.html` again
2. Check browser console for errors
3. Verify Firebase project configuration
4. Ensure Firestore rules are deployed

## 📱 Mobile Compatibility

The application is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔄 Updates

To update the system:

1. SuperAdmins can modify admin accounts
2. Admins cannot modify their hotel information (contact SuperAdmin)
3. Feedback submissions are immutable for data integrity

## 📞 Support

For technical support:

1. Check browser console for error messages
2. Verify Firebase project status
3. Review Firestore security rules
4. Contact system administrator

---

**System Status:** ✅ Ready for Production
**Last Updated:** January 2025
**Version:** 1.0.0
