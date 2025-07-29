// Configuration for GuestPulse LIVE
const CONFIG = {
    // Default settings (will be overridden by Firestore if available)
    defaultSettings: {
        hotelName: "Grand Hotel Example",
        logoUrl: "images/hotel-logo.png",
        primaryColor: "#0066cc",
        secondaryColor: "#28a745",
        emailNotifications: "demo@guestpulse.example.com",
        smsNotifications: ""
    },
    
    // EmailJS configuration (for sending notifications)
    emailJs: {
        serviceId: "service_example", // Replace with your EmailJS service ID
        templateId: "template_example", // Replace with your EmailJS template ID
        userId: "user_example" // Replace with your EmailJS user ID
    },
    
    // User roles
    roles: {
        superAdmin: "superAdmin",
        hotelAdmin: "hotelAdmin"
    },
    
    // Application states
    appStates: {
        loggedOut: "loggedOut",
        superAdmin: "superAdmin",
        hotelAdmin: "hotelAdmin",
        guest: "guest"
    },
    
    // Default Super Admin (for first-time setup only)
    defaultSuperAdmin: {
        email: "admin@guestpulse.com",
        password: "superadmin123" // Change immediately after first login
    },
    
    // Local storage keys (for fallback and non-critical data)
    storage: {
        settings: "guestpulse_settings",
        currentHotelId: "guestpulse_current_hotel"
    }
};

// Initialize EmailJS
(function() {
    if (CONFIG.emailJs.userId) {
        emailjs.init(CONFIG.emailJs.userId);
    }
})();
