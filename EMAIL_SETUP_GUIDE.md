# Email Notification Setup Guide

## Option 1: EmailJS (Recommended - Free & Easy)

EmailJS allows sending emails directly from frontend JavaScript without a backend server.

### Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create Email Service

1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions
5. Note down your **Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Template

1. In EmailJS dashboard, go to "Email Templates"
2. Click "Create New Template"
3. Use this template content:

**Subject:** `New Feedback from {{hotel_name}} Guest`

**Body:**

```
Dear {{hotel_name}} Team,

You have received new feedback from a guest:

Room Number: {{guest_room}}
Date: {{feedback_date}}
Status: {{status}}

{{#is_positive}}
Guest reported that everything is going well with their stay!
This is great news! Keep up the excellent service.
{{/is_positive}}

{{^is_positive}}
Issues reported:
- Room Cleanliness: {{room_cleanliness}}
- Service Quality: {{service_quality}}
- Amenities: {{amenities}}
- Additional Comments: {{other_issues}}

Please address these concerns promptly.
{{/is_positive}}

Best regards,
Hotel Feedback System
```

4. Save the template and note down your **Template ID** (e.g., `template_xyz789`)

### Step 4: Get Public Key

1. In EmailJS dashboard, go to "Account" → "General"
2. Find your **Public Key** (e.g., `user_abc123xyz`)

### Step 5: Update Configuration

Edit `js/email-config.js` file:

```javascript
const emailConfig = {
  emailjs: {
    serviceID: "your_service_id_here", // Replace with your Service ID
    templateID: "your_template_id_here", // Replace with your Template ID
    publicKey: "your_public_key_here", // Replace with your Public Key
  },
  // ... rest of config
};
```

### Step 6: Test Email

1. Submit a test feedback through your guest form
2. Check the console logs for "Email sent successfully"
3. Check the hotel's notification email inbox

---

## Option 2: Backend Webhook (Advanced)

If you have a backend server, you can create an email webhook.

### Step 1: Create Backend Endpoint

Create an endpoint that receives POST requests with feedback data and sends emails.

### Step 2: Update Configuration

Edit `js/email-config.js`:

```javascript
const emailConfig = {
  webhook: {
    enabled: true,
    url: "https://your-backend-api.com/send-email",
  },
  // ... rest of config
};
```

---

## Option 3: Manual Email Processing

If neither option works, the system will:

1. Store email notifications in Firestore
2. You can check the `feedback` collection for documents with `type: 'email_notification'`
3. Manually process these or create a backend script to send them

---

## Troubleshooting

### EmailJS Not Working?

1. Check browser console for error messages
2. Verify all IDs and keys are correct
3. Ensure EmailJS service is properly connected
4. Check EmailJS dashboard for quota limits
5. Verify the notification email address is correct

### Still No Emails?

1. Check spam/junk folders
2. Verify the hotel's notification email in admin settings
3. Try with a different email address
4. Check EmailJS dashboard for delivery status

### Testing

- Use the browser's Network tab to see if requests are being sent
- Check the Console tab for any JavaScript errors
- Test with a simple email address like Gmail

---

## Email Templates

The system includes pre-built templates for:

- ✅ **Positive feedback** - Congratulatory tone
- ⚠️ **Issue reports** - Urgent, actionable tone
- 📧 **Professional formatting** - Hotel industry appropriate

All templates include:

- Hotel name and branding
- Guest room number
- Timestamp
- Detailed issue breakdown (if applicable)
- Professional signature
