// Guest Feedback functionality
class GuestFeedbackManager {
    constructor() {
        this.hotelId = null;
        this.hotelData = null;
        // Wait for Firebase to be ready before initializing
        if (typeof adminsRef !== 'undefined') {
            this.init();
        } else {
            // Wait a bit for Firebase config to load
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        // Get hotel ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.hotelId = urlParams.get('hotel');

        if (!this.hotelId) {
            this.showError('Invalid feedback link. Please contact the hotel for the correct link.');
            return;
        }

        await this.loadHotelData();
        this.setupEventListeners();
        this.displayHotelInfo();
    }

    async loadHotelData() {
        try {
            // Ensure adminsRef is available
            if (typeof adminsRef === 'undefined') {
                throw new Error('Database connection not available');
            }
            
            const adminDoc = await adminsRef.doc(this.hotelId).get();
            if (adminDoc.exists) {
                const adminData = adminDoc.data();
                this.hotelData = {
                    name: adminData.hotelName,
                    imageURL: adminData.hotelImageURL || 'images/hotel-logo.png',
                    description: adminData.hotelDescription,
                    website: adminData.hotelWebsite,
                    notificationEmail: adminData.notificationEmail
                };
            } else {
                throw new Error('Hotel not found');
            }
        } catch (error) {
            console.error('Error loading hotel data:', error);
            this.showError('Unable to load hotel information. Please contact the hotel for assistance.');
        }
    }

    setupEventListeners() {
        // Guest feedback form
        const guestFeedbackForm = document.getElementById('guest-feedback-form');
        if (guestFeedbackForm) {
            guestFeedbackForm.addEventListener('submit', (e) => this.handleFeedbackSubmission(e));
        }

        // Radio button change for conditional logic
        const radioButtons = document.querySelectorAll('input[name="isEverythingOkay"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => this.handlePrimaryQuestionChange());
        });

        // Submit another feedback button
        const submitAnotherBtn = document.getElementById('submit-another-btn');
        if (submitAnotherBtn) {
            submitAnotherBtn.addEventListener('click', () => this.resetForm());
        }
    }

    displayHotelInfo() {
        if (!this.hotelData) return;

        // Update hotel logo and name
        const hotelLogo = document.getElementById('hotel-logo');
        const hotelName = document.getElementById('hotel-name');

        if (hotelLogo) {
            hotelLogo.src = this.hotelData.imageURL;
            hotelLogo.alt = `${this.hotelData.name} Logo`;
        }

        if (hotelName) {
            hotelName.textContent = this.hotelData.name;
        }

        // Update page title
        document.title = `Guest Feedback - ${this.hotelData.name}`;
    }

    handlePrimaryQuestionChange() {
        const selectedValue = document.querySelector('input[name="isEverythingOkay"]:checked')?.value;
        const followUpSection = document.getElementById('follow-up-section');

        if (selectedValue === 'yes') {
            if (followUpSection) {
                followUpSection.style.display = 'none';
            }
            this.clearFollowUpQuestions();
        } else if (selectedValue === 'no') {
            if (followUpSection) {
                followUpSection.style.display = 'block';
            }
        }
    }

    clearFollowUpQuestions() {
        // Clear all follow-up question values
        const followUpInputs = document.querySelectorAll('#follow-up-section select, #follow-up-section textarea');
        followUpInputs.forEach(input => {
            input.value = '';
        });
    }

    async handleFeedbackSubmission(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isEverythingOkay = formData.get('isEverythingOkay') === 'yes';
        const roomNumber = formData.get('roomNumber')?.trim();

        // Validation
        if (!roomNumber) {
            this.showError('Please enter your room number.');
            return;
        }

        const feedbackData = {
            adminUID: this.hotelId,
            hotelName: this.hotelData.name,
            guestRoom: roomNumber,
            isEverythingOkay: isEverythingOkay,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add issue details if everything is not okay
        if (!isEverythingOkay) {
            const roomCleanliness = formData.get('roomCleanliness');
            const amenities = formData.get('amenities');
            const staffBehavior = formData.get('staffBehavior');
            const otherIssues = formData.get('otherIssues')?.trim();

            feedbackData.issues = {
                roomCleanliness: roomCleanliness || null,
                amenities: amenities || null,
                staffBehavior: staffBehavior || null,
                otherIssues: otherIssues || null
            };
        }

        const submitBtn = document.getElementById('submit-btn');
        this.setButtonLoading(submitBtn, true);

        try {
            // Ensure feedbackRef is available
            if (typeof feedbackRef === 'undefined') {
                throw new Error('Database connection not available');
            }
            
            await feedbackRef.add(feedbackData);
            
            // Send email notification if we have notification email
            if (this.hotelData.notificationEmail) {
                await this.sendEmailNotification(feedbackData, isEverythingOkay);
            }
            
            this.showThankYou(isEverythingOkay);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.showError('Failed to submit your feedback. Please try again or contact the hotel directly.');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    showThankYou(isPositive) {
        const formSection = document.querySelector('.card-body form').parentElement;
        const thankYouSection = document.getElementById('thank-you-section');
        const thankYouMessage = document.getElementById('thank-you-message');

        // Hide form
        if (formSection) {
            formSection.style.display = 'none';
        }

        // Show thank you section
        if (thankYouSection) {
            thankYouSection.style.display = 'block';
        }

        // Customize message based on feedback type
        if (thankYouMessage) {
            if (isPositive) {
                thankYouMessage.textContent = "We're delighted to hear that everything is going well with your stay! Thank you for taking the time to share your positive experience.";
            } else {
                thankYouMessage.textContent = "Thank you for bringing these concerns to our attention. Our team will review your feedback and work to address any issues promptly.";
            }
        }

        // Redirect to hotel website after 3 seconds
        if (this.hotelData.website) {
            setTimeout(() => {
                window.open(this.hotelData.website, '_blank');
            }, 3000);
        }
    }

    async sendEmailNotification(feedbackData, isPositive) {
        try {
            console.log('Preparing to send email notification...');
            
            // Check if email configuration is available
            if (typeof emailConfig === 'undefined') {
                console.error('Email configuration not loaded');
                return await this.sendEmailFallback(feedbackData, isPositive);
            }
            
            // Check if notification email exists
            if (!this.hotelData.notificationEmail || this.hotelData.notificationEmail.trim() === '') {
                console.error('No notification email configured for this hotel');
                return await this.sendEmailFallback(feedbackData, isPositive);
            }
            
            // Prepare email data with standard EmailJS field names
            const emailData = {
                // Multiple email field formats for compatibility
                to_email: this.hotelData.notificationEmail,
                email: this.hotelData.notificationEmail,
                recipient_email: this.hotelData.notificationEmail,
                reply_to: this.hotelData.notificationEmail,
                
                to_name: this.hotelData.name + ' Team',
                from_name: 'Hotel Feedback System',
                hotel_name: this.hotelData.name,
                guest_room: feedbackData.guestRoom,
                feedback_date: new Date().toLocaleString(),
                is_positive: isPositive,
                status: isPositive ? 'Positive Feedback' : 'Issue Reported',
                room_cleanliness: feedbackData.issues?.roomCleanliness || 'N/A',
                service_quality: feedbackData.issues?.staffBehavior || 'N/A',
                amenities: feedbackData.issues?.amenities || 'N/A',
                other_issues: feedbackData.issues?.otherIssues || 'N/A',
                feedback_url: window.location.href,
                subject: emailConfig.templates.subject.replace('{{hotel_name}}', this.hotelData.name),
                message: isPositive ? 'Guest reported that everything is going well with their stay!' : 'Guest has reported some issues that need attention.'
            };
            
            // Debug logging
            console.log('Hotel notification email:', this.hotelData.notificationEmail);
            console.log('Email data prepared:', emailData);
            
            // Add the formatted body after emailData is created
            emailData.body = this.formatEmailBody(isPositive, emailData);
            
            // Try to send email using EmailJS
            if (typeof emailjs !== 'undefined' && emailConfig.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
                console.log('Sending email via EmailJS...');
                const result = await emailjs.send(
                    emailConfig.emailjs.serviceID,
                    emailConfig.emailjs.templateID,
                    emailData,
                    emailConfig.emailjs.publicKey
                );
                console.log('Email sent successfully:', result);
                return;
            }
            
            // Try webhook if configured
            if (emailConfig.webhook.enabled && emailConfig.webhook.url) {
                console.log('Sending email via webhook...');
                const response = await fetch(emailConfig.webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData)
                });
                
                if (response.ok) {
                    console.log('Email sent successfully via webhook');
                    return;
                }
            }
            
            // Fallback to storing for backend processing
            console.log('Using fallback email method...');
            await this.sendEmailFallback(emailData, isPositive);
            
        } catch (error) {
            console.error('Error sending email notification:', error);
            // Don't throw error to avoid disrupting the feedback flow
            // Create emailData for fallback if it doesn't exist
            const fallbackEmailData = {
                to_name: this.hotelData.name + ' Team',
                to_email: this.hotelData.notificationEmail,
                from_name: 'Hotel Feedback System',
                hotel_name: this.hotelData.name,
                guest_room: feedbackData.guestRoom,
                feedback_date: new Date().toLocaleString(),
                is_positive: isPositive,
                status: isPositive ? 'Positive Feedback' : 'Issue Reported',
                room_cleanliness: feedbackData.issues?.roomCleanliness || 'N/A',
                service_quality: feedbackData.issues?.staffBehavior || 'N/A',
                amenities: feedbackData.issues?.amenities || 'N/A',
                other_issues: feedbackData.issues?.otherIssues || 'N/A',
                feedback_url: window.location.href,
                subject: (typeof emailConfig !== 'undefined' ? emailConfig.templates.subject.replace('{{hotel_name}}', this.hotelData.name) : `New Feedback from ${this.hotelData.name} Guest`),
                message: isPositive ? 'Guest reported that everything is going well with their stay!' : 'Guest has reported some issues that need attention.'
            };
            fallbackEmailData.body = this.formatEmailBody(isPositive, fallbackEmailData);
            
            await this.sendEmailFallback(fallbackEmailData, isPositive);
        }
    }

    formatEmailBody(isPositive, emailData) {
        let template = isPositive ? emailConfig.templates.positiveBody : emailConfig.templates.issueBody;
        
        // Replace template variables
        Object.keys(emailData).forEach(key => {
            const placeholder = `{{${key}}}`;
            template = template.replace(new RegExp(placeholder, 'g'), emailData[key]);
        });
        
        return template;
    }

    async sendEmailFallback(emailData, isPositive) {
        try {
            // Fallback 1: Store in Firestore for backend processing
            await feedbackRef.add({
                type: 'email_notification',
                emailData: emailData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                sent: false,
                method: 'pending_backend_processing'
            });
            console.log('Email notification stored for backend processing');
            
            // Fallback 2: Create mailto link as last resort
            this.createMailtoLink(emailData);
            
        } catch (error) {
            console.error('Error in email fallback:', error);
        }
    }

    createMailtoLink(emailData) {
        try {
            const subject = `New Feedback from ${emailData.hotel_name} Guest`;
            const body = `
New feedback received from ${emailData.hotel_name}

Room Number: ${emailData.guest_room}
Date: ${emailData.feedback_date}
Status: ${emailData.status}

${!emailData.is_positive ? `
Issues Reported:
- Room Cleanliness: ${emailData.room_cleanliness}
- Service Quality: ${emailData.service_quality}
- Amenities: ${emailData.amenities}
- Other Issues: ${emailData.other_issues}
` : 'Guest reported that everything is going well with their stay.'}

This email was generated automatically from your hotel feedback system.
            `.trim();
            
            const mailtoLink = `mailto:${emailData.to_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Store the mailto link for potential use
            console.log('Mailto link created:', mailtoLink);
            
            // You could uncomment this to automatically open the user's email client
            // window.open(mailtoLink);
            
        } catch (error) {
            console.error('Error creating mailto link:', error);
        }
    }

    formatFeedbackForEmail(feedbackData, isPositive) {
        let emailBody = `New feedback received from ${this.hotelData.name}\n\n`;
        emailBody += `Room Number: ${feedbackData.guestRoom}\n`;
        emailBody += `Date: ${new Date().toLocaleString()}\n`;
        emailBody += `Status: ${isPositive ? 'Positive' : 'Issue Reported'}\n\n`;
        
        if (!isPositive) {
            emailBody += "Issues Reported:\n";
            if (feedbackData.roomCleanliness) emailBody += `- Room Cleanliness: ${feedbackData.roomCleanliness}\n`;
            if (feedbackData.serviceQuality) emailBody += `- Service Quality: ${feedbackData.serviceQuality}\n`;
            if (feedbackData.amenities) emailBody += `- Amenities: ${feedbackData.amenities}\n`;
            if (feedbackData.otherIssues) emailBody += `- Other Issues: ${feedbackData.otherIssues}\n`;
        }
        
        return emailBody;
    }

    resetForm() {
        // Show form again
        const formSection = document.querySelector('.card-body');
        const thankYouSection = document.getElementById('thank-you-section');
        const form = document.getElementById('guest-feedback-form');
        const followUpSection = document.getElementById('follow-up-section');

        if (formSection) {
            formSection.style.display = 'block';
        }

        if (thankYouSection) {
            thankYouSection.style.display = 'none';
        }

        if (form) {
            form.reset();
        }

        if (followUpSection) {
            followUpSection.style.display = 'none';
        }

        // Hide any error messages
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'block';
            button.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'block';
            if (btnLoader) btnLoader.style.display = 'none';
            button.disabled = false;
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            
            // Scroll to error message
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert(message);
        }
    }
}

// Initialize Guest Feedback functionality when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to ensure Firebase config is loaded
    setTimeout(() => {
        new GuestFeedbackManager();
    }, 200);
});
