// Admin Dashboard functionality
class AdminManager {
    constructor() {
        this.currentAdmin = null;
        this.hotelData = null;
        this.init();
    }

    async init() {
        // Verify Admin access
        const authResult = await authManager.requireRole(appConfig.roles.ADMIN);
        if (!authResult) return;

        this.currentUser = authResult.user;
        await this.loadAdminData();
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadHotelInfo();
        this.setupFeedbackLink();
        this.loadFeedbackHistory();
    }

    async loadAdminData() {
        try {
            const adminDoc = await adminsRef.doc(this.currentUser.uid).get();
            if (adminDoc.exists) {
                this.currentAdmin = adminDoc.data();
                this.hotelData = {
                    name: this.currentAdmin.hotelName,
                    imageURL: this.currentAdmin.hotelImageURL,
                    description: this.currentAdmin.hotelDescription,
                    website: this.currentAdmin.hotelWebsite,
                    notificationEmail: this.currentAdmin.notificationEmail
                };
            } else {
                throw new Error('Admin data not found');
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
            alert('Failed to load admin data. Please contact support.');
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

        // Copy feedback link
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyFeedbackLink());
        }

        // Download QR code
        const downloadQrBtn = document.getElementById('download-qr-btn');
        if (downloadQrBtn) {
            downloadQrBtn.addEventListener('click', () => this.downloadQRCode());
        }

        // Generate online QR code
        const generateOnlineQrBtn = document.getElementById('generate-online-qr-btn');
        if (generateOnlineQrBtn) {
            generateOnlineQrBtn.addEventListener('click', () => this.generateOnlineQRCode());
        }

        // Refresh feedback
        const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
        if (refreshFeedbackBtn) {
            refreshFeedbackBtn.addEventListener('click', () => this.loadFeedbackHistory());
        }

        // Feedback filter
        const feedbackFilter = document.getElementById('feedback-filter');
        if (feedbackFilter) {
            feedbackFilter.addEventListener('change', () => this.loadFeedbackHistory());
        }
    }

    loadUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && this.currentUser) {
            userEmailElement.textContent = this.currentUser.email;
        }
    }

    loadHotelInfo() {
        if (!this.hotelData) return;

        // Update header
        const headerHotelName = document.getElementById('header-hotel-name');
        if (headerHotelName) {
            headerHotelName.textContent = `${this.hotelData.name} - Dashboard`;
        }

        // Update hotel display section
        const hotelImage = document.getElementById('hotel-image');
        const hotelNameDisplay = document.getElementById('hotel-name-display');
        const hotelDescriptionDisplay = document.getElementById('hotel-description-display');

        if (hotelImage && this.hotelData.imageURL) {
            hotelImage.src = this.hotelData.imageURL;
            hotelImage.alt = `${this.hotelData.name} Logo`;
        }

        if (hotelNameDisplay) {
            hotelNameDisplay.textContent = this.hotelData.name;
        }

        if (hotelDescriptionDisplay) {
            hotelDescriptionDisplay.textContent = this.hotelData.description || 'No description available.';
        }
    }

    setupFeedbackLink() {
        const feedbackLinkInput = document.getElementById('feedback-link-input');
        if (feedbackLinkInput && this.currentUser) {
            const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
            const feedbackUrl = `${baseUrl}guest-feedback.html?hotel=${this.currentUser.uid}`;
            feedbackLinkInput.value = feedbackUrl;
            
            // Generate QR code with retry mechanism
            this.generateQRCodeWithRetry(feedbackUrl, 0);
        }
    }

    async generateQRCodeWithRetry(url, retryCount = 0) {
        if (retryCount > 5) {
            console.error('QR code generation failed after multiple attempts');
            this.showQRFallback();
            return;
        }

        if (typeof qrcode !== 'undefined') {
            await this.generateQRCode(url);
        } else {
            console.log(`QR library not ready, retrying in ${(retryCount + 1) * 500}ms...`);
            setTimeout(() => {
                this.generateQRCodeWithRetry(url, retryCount + 1);
            }, (retryCount + 1) * 500);
        }
    }

    async generateQRCode(url) {
        try {
            console.log('Generating QR code for URL:', url);
            const qrCodeElement = document.getElementById('qr-code');
            console.log('QR code element:', qrCodeElement);
            console.log('qrcode library available:', typeof qrcode !== 'undefined');
            
            if (!qrCodeElement) {
                console.error('QR code element not found');
                return;
            }

            if (typeof qrcode === 'undefined') {
                console.error('qrcode library not loaded');
                this.showQRFallback();
                return;
            }
                
            // Clear previous QR code
            qrCodeElement.innerHTML = '';
            
            // Create QR code using qrcode-generator library
            const qr = qrcode(0, 'M');
            qr.addData(url);
            qr.make();
            
            // Create the QR code as an image
            const qrImage = qr.createImgTag(4, 8); // cellSize=4, margin=8
            qrCodeElement.innerHTML = qrImage;
            
            // Style the image
            const img = qrCodeElement.querySelector('img');
            if (img) {
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.style.border = '1px solid #ddd';
                img.style.borderRadius = '8px';
            }
            
            console.log('QR code generated successfully');
                
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.showQRFallback();
        }
    }

    showQRFallback() {
        const qrCodeElement = document.getElementById('qr-code');
        if (qrCodeElement) {
            console.log('Trying online QR generation as fallback...');
            const feedbackLinkInput = document.getElementById('feedback-link-input');
            
            if (feedbackLinkInput && feedbackLinkInput.value) {
                const url = feedbackLinkInput.value;
                const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
                
                qrCodeElement.innerHTML = `
                    <img src="${qrServiceUrl}" 
                         alt="QR Code for Feedback Link" 
                         style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 8px;"
                         onload="console.log('Fallback online QR code loaded successfully')"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc; border-radius: 8px;">
                        <p><strong>QR Code generation failed</strong></p>
                        <p style="font-size: 0.9rem;">Please use the feedback link above to share with guests.</p>
                        <p style="font-size: 0.8rem; margin-top: 10px;">You can click "Generate Online" to try again.</p>
                    </div>
                `;
            } else {
                qrCodeElement.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc; border-radius: 8px;">
                        <p><strong>QR Code generation failed</strong></p>
                        <p style="font-size: 0.9rem;">Please use the feedback link above to share with guests.</p>
                        <p style="font-size: 0.8rem; margin-top: 10px;">You can click "Generate Online" to try again.</p>
                    </div>
                `;
            }
        }
    }

    generateOnlineQRCode() {
        const feedbackLinkInput = document.getElementById('feedback-link-input');
        if (feedbackLinkInput && feedbackLinkInput.value) {
            const url = feedbackLinkInput.value;
            const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
            
            const qrCodeElement = document.getElementById('qr-code');
            if (qrCodeElement) {
                qrCodeElement.innerHTML = `
                    <img src="${qrServiceUrl}" 
                         alt="QR Code for Feedback Link" 
                         style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 8px;"
                         onload="console.log('Online QR code loaded successfully')"
                         onerror="console.error('Failed to load online QR code'); this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc; border-radius: 8px;">
                        <p>Unable to generate QR code</p>
                        <p style="font-size: 0.9rem;">Please use the feedback link above</p>
                    </div>
                `;
                console.log('Online QR code generation initiated');
            }
        }
    }

    async downloadQRCode() {
        try {
            const img = document.querySelector('#qr-code img');
            if (img) {
                // Create a canvas to convert the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to match image
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                
                // Draw the image on canvas
                ctx.drawImage(img, 0, 0);
                
                // Create download link
                const link = document.createElement('a');
                link.download = `${this.hotelData.name.replace(/[^a-zA-Z0-9]/g, '_')}-feedback-qr.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else {
                alert('QR code not available for download. Please refresh the page and try again.');
            }
        } catch (error) {
            console.error('Error downloading QR code:', error);
            alert('Failed to download QR code. You can right-click the QR code and save the image manually.');
        }
    }

    async copyFeedbackLink() {
        const feedbackLinkInput = document.getElementById('feedback-link-input');
        if (feedbackLinkInput && feedbackLinkInput.value) {
            try {
                await navigator.clipboard.writeText(feedbackLinkInput.value);
                const btn = document.getElementById('copy-link-btn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy link:', error);
                alert('Failed to copy link to clipboard');
            }
        }
    }

    handlePrimaryQuestionChange() {
        const selectedValue = document.querySelector('input[name="isEverythingOkay"]:checked')?.value;
        const followUpQuestions = document.getElementById('follow-up-questions');
        const thankYouMessage = document.getElementById('thank-you-message');

        if (selectedValue === 'yes') {
            if (followUpQuestions) followUpQuestions.style.display = 'none';
            if (thankYouMessage) {
                thankYouMessage.style.display = 'block';
                thankYouMessage.innerHTML = `
                    <h3>Thank you for your feedback!</h3>
                    <p>We're delighted to hear that everything is going well with your stay. 
                    If you need anything during your visit, please don't hesitate to contact our staff.</p>
                `;
            }
        } else if (selectedValue === 'no') {
            if (followUpQuestions) followUpQuestions.style.display = 'block';
            if (thankYouMessage) thankYouMessage.style.display = 'none';
        }
    }

    async handleFeedbackSubmission(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isEverythingOkay = formData.get('isEverythingOkay') === 'yes';
        
        const feedbackData = {
            adminUID: this.currentUser.uid,
            hotelName: this.hotelData.name,
            guestRoom: formData.get('guestRoom').trim(),
            isEverythingOkay: isEverythingOkay,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add issue details if everything is not okay
        if (!isEverythingOkay) {
            feedbackData.issues = {
                roomCleanliness: formData.get('roomCleanliness') || null,
                amenities: formData.get('amenities') || null,
                staffBehavior: formData.get('staffBehavior') || null,
                otherIssues: formData.get('otherIssues')?.trim() || null
            };
        }

        const submitBtn = document.getElementById('submit-feedback-btn');
        setButtonLoading(submitBtn, true);

        try {
            await feedbackRef.add(feedbackData);
            this.showFeedbackMessage('Thank you for your feedback! We appreciate your input.', 'success');
            e.target.reset();
            
            // Hide follow-up questions and thank you message
            const followUpQuestions = document.getElementById('follow-up-questions');
            const thankYouMessage = document.getElementById('thank-you-message');
            if (followUpQuestions) followUpQuestions.style.display = 'none';
            if (thankYouMessage) thankYouMessage.style.display = 'none';
            
            // Refresh feedback history
            this.loadFeedbackHistory();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.showFeedbackMessage('Failed to submit feedback. Please try again.', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    async loadFeedbackHistory() {
        const feedbackHistory = document.getElementById('feedback-history');
        const feedbackLoading = document.getElementById('feedback-loading');
        const feedbackFilter = document.getElementById('feedback-filter');
        
        if (feedbackLoading) {
            feedbackLoading.style.display = 'block';
        }

        try {
            let query = feedbackRef
                .where('adminUID', '==', this.currentUser.uid)
                .orderBy('submittedAt', 'desc');

            // Apply filter
            const filterValue = feedbackFilter?.value || 'all';
            if (filterValue === 'issues') {
                query = query.where('isEverythingOkay', '==', false);
            } else if (filterValue === 'positive') {
                query = query.where('isEverythingOkay', '==', true);
            }

            const querySnapshot = await query.limit(50).get();

            if (feedbackHistory) {
                feedbackHistory.innerHTML = '';
                
                if (querySnapshot.empty) {
                    feedbackHistory.innerHTML = '<p class="no-data">No feedback received yet.</p>';
                } else {
                    querySnapshot.forEach((doc) => {
                        const feedback = doc.data();
                        feedbackHistory.appendChild(this.createFeedbackCard(feedback, doc.id));
                    });
                }
            }
        } catch (error) {
            console.error('Error loading feedback:', error);
            if (feedbackHistory) {
                feedbackHistory.innerHTML = '<p class="error">Failed to load feedback history.</p>';
            }
        } finally {
            if (feedbackLoading) {
                feedbackLoading.style.display = 'none';
            }
        }
    }

    createFeedbackCard(feedback, feedbackId) {
        const card = document.createElement('div');
        card.className = `feedback-item ${feedback.isEverythingOkay ? 'positive' : 'issue'}`;
        
        const submittedDate = feedback.submittedAt ? 
            feedback.submittedAt.toDate().toLocaleString() : 
            'Unknown date';

        let issueDetails = '';
        if (!feedback.isEverythingOkay && feedback.issues) {
            const issues = feedback.issues;
            issueDetails = `
                <div class="feedback-details">
                    ${issues.roomCleanliness ? `
                        <div class="detail-item">
                            <span class="detail-label">Room Cleanliness</span>
                            <span class="detail-value">${this.formatValue(issues.roomCleanliness)}</span>
                        </div>
                    ` : ''}
                    ${issues.amenities ? `
                        <div class="detail-item">
                            <span class="detail-label">Amenities</span>
                            <span class="detail-value">${this.formatValue(issues.amenities)}</span>
                        </div>
                    ` : ''}
                    ${issues.staffBehavior ? `
                        <div class="detail-item">
                            <span class="detail-label">Staff Behavior</span>
                            <span class="detail-value">${this.formatValue(issues.staffBehavior)}</span>
                        </div>
                    ` : ''}
                    ${issues.otherIssues ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">Additional Comments</span>
                            <p class="detail-value">${issues.otherIssues}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-room">Room ${feedback.guestRoom}</span>
                <span class="feedback-date">${submittedDate}</span>
                <span class="feedback-status ${feedback.isEverythingOkay ? 'positive' : 'issue'}">
                    ${feedback.isEverythingOkay ? 'Positive' : 'Issue Reported'}
                </span>
                <button class="btn btn-danger btn-small delete-feedback-btn" onclick="adminManager.deleteFeedback('${feedbackId}')">
                    Delete
                </button>
            </div>
            ${issueDetails}
            ${feedback.isEverythingOkay ? '<p class="positive-message">Guest reported that everything is going well with their stay.</p>' : ''}
        `;

        return card;
    }

    async deleteFeedback(feedbackId) {
        if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
            return;
        }

        try {
            await feedbackRef.doc(feedbackId).delete();
            this.showFeedbackMessage('Feedback deleted successfully', 'success');
            // Reload feedback history to update the display
            await this.loadFeedbackHistory();
        } catch (error) {
            console.error('Error deleting feedback:', error);
            this.showFeedbackMessage('Failed to delete feedback. Please try again.', 'error');
        }
    }

    formatValue(value) {
        return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    showFeedbackMessage(message, type = 'success') {
        const messageElement = document.getElementById('feedback-message');
        if (messageElement) {
            showMessage(messageElement, message, type);
        }
    }
}

// Global admin manager instance
let adminManager;

// Wait for both DOM and all scripts to load
window.addEventListener('load', () => {
    console.log('Window loaded, checking for qrcode library:', typeof qrcode !== 'undefined');
    initializeAdmin();
});

// Also initialize on DOM ready as fallback
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for qrcode library:', typeof qrcode !== 'undefined');
    if (!adminManager) {
        setTimeout(initializeAdmin, 1000); // Add small delay
    }
});

function initializeAdmin() {
    if (!adminManager) {
        console.log('Initializing AdminManager...');
        adminManager = new AdminManager();
    }
}
