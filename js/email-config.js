// Email Configuration for Hotel Feedback System
// Configure EmailJS or other email services here

const emailConfig = {
    // EmailJS Configuration
    // Sign up at https://www.emailjs.com/ to get these values
    emailjs: {
        serviceID: 'service_plczayn', // Your EmailJS service ID
        templateID: 'template_lfu6p02', // Your EmailJS template ID
        publicKey: 'E1HV2ScahRpBKQ11D' // Your EmailJS public key
    },
    
    // Alternative: Webhook URL for backend email processing
    webhook: {
        enabled: false,
        url: 'https://your-backend-api.com/send-email' // Replace with your backend URL
    },
    
    // Email template configuration
    templates: {
        subject: 'New Feedback from {{hotel_name}} Guest',
        positiveBody: `
Hello {{to_name}},

You have received positive feedback from a guest:

Room Number: {{guest_room}}
Date: {{feedback_date}}
Message: {{message}}

This is great news! Keep up the excellent service.

Best regards,
{{from_name}}
        `,
        issueBody: `
Hello {{to_name}},

You have received feedback reporting issues from a guest:

Room Number: {{guest_room}}
Date: {{feedback_date}}
Status: {{status}}

Issues Details:
- Room Cleanliness: {{room_cleanliness}}
- Service Quality: {{service_quality}}
- Amenities: {{amenities}}
- Additional Comments: {{other_issues}}

Please address these concerns as soon as possible.

Best regards,
{{from_name}}
        `
    }
};

// Initialize EmailJS when the script loads
if (typeof emailjs !== 'undefined' && emailConfig.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
    emailjs.init(emailConfig.emailjs.publicKey);
    console.log('EmailJS initialized successfully');
} else {
    console.warn('EmailJS not initialized - missing configuration or library');
}
