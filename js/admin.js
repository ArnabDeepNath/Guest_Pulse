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
                    description: this.currentAdmin.hotelDescription
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
            
            // Generate QR code
            this.generateQRCode(feedbackUrl);
        }
    }

    async generateQRCode(url) {
        try {
            const qrCodeElement = document.getElementById('qr-code');
            if (qrCodeElement && typeof QRCode !== 'undefined') {
                // Clear previous QR code
                qrCodeElement.innerHTML = '';
                
                // Generate new QR code
                await QRCode.toCanvas(qrCodeElement, url, {
                    width: 200,
                    height: 200,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }

    async downloadQRCode() {
        try {
            const canvas = document.querySelector('#qr-code canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `${this.hotelData.name}-feedback-qr.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
        } catch (error) {
            console.error('Error downloading QR code:', error);
            alert('Failed to download QR code');
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
            </div>
            ${issueDetails}
            ${feedback.isEverythingOkay ? '<p class="positive-message">Guest reported that everything is going well with their stay.</p>' : ''}
        `;

        return card;
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

// Initialize Admin functionality when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminManager();
});
