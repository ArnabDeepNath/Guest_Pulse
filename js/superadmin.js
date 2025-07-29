// SuperAdmin Dashboard functionality
class SuperAdminManager {
    constructor() {
        this.init();
    }

    async init() {
        // Verify SuperAdmin access
        const authResult = await authManager.requireRole(appConfig.roles.SUPERADMIN);
        if (!authResult) return;

        this.currentUser = authResult.user;
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadAdmins();
        this.generatePassword(); // Generate initial password
    }

    setupEventListeners() {
        // Create admin form
        const createAdminForm = document.getElementById('create-admin-form');
        if (createAdminForm) {
            createAdminForm.addEventListener('submit', (e) => this.handleCreateAdmin(e));
        }

        // Password generation
        const generatePasswordBtn = document.getElementById('generate-password-btn');
        if (generatePasswordBtn) {
            generatePasswordBtn.addEventListener('click', () => this.generatePassword());
        }

        // Copy password
        const copyPasswordBtn = document.getElementById('copy-password-btn');
        if (copyPasswordBtn) {
            copyPasswordBtn.addEventListener('click', () => this.copyPassword());
        }

        // Refresh admins
        const refreshAdminsBtn = document.getElementById('refresh-admins-btn');
        if (refreshAdminsBtn) {
            refreshAdminsBtn.addEventListener('click', () => this.loadAdmins());
        }
    }

    loadUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && this.currentUser) {
            userEmailElement.textContent = this.currentUser.email;
        }
    }

    generatePassword() {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        const passwordInput = document.getElementById('generated-password');
        if (passwordInput) {
            passwordInput.value = password;
        }
    }

    async copyPassword() {
        const passwordInput = document.getElementById('generated-password');
        if (passwordInput && passwordInput.value) {
            try {
                await navigator.clipboard.writeText(passwordInput.value);
                // Show feedback
                const btn = document.getElementById('copy-password-btn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy password:', error);
                alert('Failed to copy password to clipboard');
            }
        }
    }

    async handleCreateAdmin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const adminData = {
            email: formData.get('adminEmail').trim(),
            password: formData.get('generatedPassword'),
            hotelName: formData.get('hotelName').trim(),
            hotelImageURL: formData.get('hotelImageURL').trim() || 'images/hotel-logo.png',
            hotelDescription: formData.get('hotelDescription').trim(),
            hotelWebsite: formData.get('hotelWebsite').trim(),
            notificationEmail: formData.get('notificationEmail').trim()
        };

        // Validation
        if (!adminData.email || !adminData.password || !adminData.hotelName || !adminData.hotelWebsite || !adminData.notificationEmail) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const createAdminBtn = document.getElementById('create-admin-btn');
        setButtonLoading(createAdminBtn, true);

        try {
            await this.createAdminAccount(adminData);
            this.showMessage('Admin account created successfully!', 'success');
            e.target.reset();
            this.generatePassword(); // Generate new password for next use
            this.loadAdmins(); // Refresh admin list
        } catch (error) {
            console.error('Error creating admin:', error);
            this.showMessage(error.message || 'Failed to create admin account.', 'error');
        } finally {
            setButtonLoading(createAdminBtn, false);
        }
    }

    async createAdminAccount(adminData) {
        try {
            // Create authentication account
            const userCredential = await auth.createUserWithEmailAndPassword(
                adminData.email, 
                adminData.password
            );
            const user = userCredential.user;

            // Store admin data in Firestore
            await adminsRef.doc(user.uid).set({
                email: adminData.email,
                role: appConfig.roles.ADMIN,
                hotelName: adminData.hotelName,
                hotelImageURL: adminData.hotelImageURL,
                hotelDescription: adminData.hotelDescription,
                hotelWebsite: adminData.hotelWebsite,
                notificationEmail: adminData.notificationEmail,
                createdBy: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true
            });

            // Sign out the newly created user and sign back in as SuperAdmin
            await auth.signOut();
            await auth.signInWithEmailAndPassword(
                this.currentUser.email, 
                prompt('Please enter your SuperAdmin password to continue:')
            );

            return user;
        } catch (error) {
            console.error('Error in createAdminAccount:', error);
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }

    async loadAdmins() {
        const adminsList = document.getElementById('admins-list');
        const adminsLoading = document.getElementById('admins-loading');
        
        if (adminsLoading) {
            adminsLoading.style.display = 'block';
        }

        try {
            // Simple query without orderBy to avoid composite index requirement
            const querySnapshot = await adminsRef
                .where('createdBy', '==', this.currentUser.uid)
                .get();

            if (adminsList) {
                adminsList.innerHTML = '';
                
                if (querySnapshot.empty) {
                    adminsList.innerHTML = '<p class="no-data">No admin accounts created yet.</p>';
                } else {
                    // Convert to array and sort manually
                    const admins = [];
                    querySnapshot.forEach((doc) => {
                        const admin = doc.data();
                        admin.id = doc.id;
                        admins.push(admin);
                    });
                    
                    // Sort by creation date (newest first)
                    admins.sort((a, b) => {
                        if (!a.createdAt || !b.createdAt) return 0;
                        return b.createdAt.toDate() - a.createdAt.toDate();
                    });
                    
                    // Display sorted admins
                    admins.forEach((admin) => {
                        adminsList.appendChild(this.createAdminCard(admin, admin.id));
                    });
                }
            }
        } catch (error) {
            console.error('Error loading admins:', error);
            if (adminsList) {
                adminsList.innerHTML = '<p class="error">Failed to load admin accounts.</p>';
            }
        } finally {
            if (adminsLoading) {
                adminsLoading.style.display = 'none';
            }
        }
    }

    createAdminCard(admin, adminId) {
        const card = document.createElement('div');
        const isDeleted = admin.status === 'deleted' || !admin.isActive;
        card.className = `admin-item admin-card ${isDeleted ? 'admin-deleted' : ''}`;
        
        // Add click event to show modal
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking on action buttons
            if (!e.target.closest('.admin-actions')) {
                this.showAdminDetailsModal(admin, adminId);
            }
        });
        
        const createdDate = admin.createdAt ? 
            admin.createdAt.toDate().toLocaleDateString() : 
            'Unknown';

        const deletedDate = admin.deletedAt ? 
            admin.deletedAt.toDate().toLocaleDateString() : 
            null;

        const statusText = isDeleted ? 
            (admin.status === 'deleted' ? 'Deleted' : 'Inactive') : 
            'Active';

        const statusClass = isDeleted ? 'status-deleted' : 'status-active';

        card.innerHTML = `
            <div class="admin-item-header">
                <span class="admin-email ${isDeleted ? 'deleted-email' : ''}">${admin.email}</span>
                <span class="admin-role">${admin.role}</span>
                <div class="admin-actions">
                    ${isDeleted ? 
                        `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); superAdminManager.restoreAdmin('${adminId}', '${admin.email}')">Restore</button>` :
                        `<button class="btn btn-danger btn-small delete-admin-btn" onclick="event.stopPropagation(); superAdminManager.deleteAdmin('${adminId}', '${admin.email}')">Delete</button>`
                    }
                </div>
            </div>
            <div class="admin-details">
                <div class="detail-item">
                    <span class="detail-label">Hotel Name</span>
                    <span class="detail-value">${admin.hotelName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Website</span>
                    <span class="detail-value">${admin.hotelWebsite || 'Not provided'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created Date</span>
                    <span class="detail-value">${createdDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;

        return card;
    }

    showAdminDetailsModal(admin, adminId) {
        // Populate modal with admin data
        document.getElementById('modal-admin-email').textContent = admin.email;
        document.getElementById('modal-hotel-name').textContent = admin.hotelName;
        document.getElementById('modal-hotel-description').textContent = admin.hotelDescription || 'Not provided';
        
        const websiteLink = document.getElementById('modal-hotel-website');
        if (admin.hotelWebsite) {
            websiteLink.href = admin.hotelWebsite;
            websiteLink.textContent = admin.hotelWebsite;
            websiteLink.style.display = 'inline';
        } else {
            websiteLink.style.display = 'none';
        }
        
        const hotelImage = document.getElementById('modal-hotel-image');
        hotelImage.src = admin.hotelImageURL || 'images/hotel-logo.png';
        
        document.getElementById('modal-notification-email').textContent = admin.notificationEmail || 'Not provided';
        
        const createdDate = admin.createdAt ? admin.createdAt.toDate().toLocaleString() : 'Unknown';
        document.getElementById('modal-created-at').textContent = createdDate;
        
        const isDeleted = admin.status === 'deleted' || !admin.isActive;
        const statusBadge = document.getElementById('modal-admin-status');
        statusBadge.textContent = isDeleted ? (admin.status === 'deleted' ? 'Deleted' : 'Inactive') : 'Active';
        statusBadge.className = `status-badge ${isDeleted ? 'status-deleted' : 'status-active'}`;
        
        // Set feedback URL
        const feedbackUrl = `${window.location.origin}/guest-feedback.html?hotel=${adminId}`;
        document.getElementById('modal-feedback-url').value = feedbackUrl;
        
        // Set up delete button
        const deleteBtn = document.getElementById('modal-delete-admin-btn');
        deleteBtn.onclick = () => {
            closeModal('admin-details-modal');
            this.deleteAdmin(adminId, admin.email);
        };
        
        // Show modal
        document.getElementById('admin-details-modal').style.display = 'flex';
    }

    showMessage(message, type = 'success') {
        const messageElement = document.getElementById('create-admin-message');
        if (messageElement) {
            showMessage(messageElement, message, type);
        }
    }

    async deleteAdmin(adminId, adminEmail) {
        const deleteOption = confirm(`Choose deletion method for admin: ${adminEmail}\n\nClick OK for SOFT DELETE (recommended):\n- Marks admin as inactive in database\n- Preserves data for audit purposes\n- Firebase Auth user remains\n\nClick Cancel for HARD DELETE:\n- Permanently removes admin data\n- Firebase Auth user will remain active\n- Requires manual cleanup in Firebase Console`);
        
        if (deleteOption) {
            // Soft delete - mark as inactive
            await this.softDeleteAdmin(adminId, adminEmail);
        } else {
            // Hard delete - remove from Firestore only
            await this.hardDeleteAdmin(adminId, adminEmail);
        }
    }

    async softDeleteAdmin(adminId, adminEmail) {
        try {
            console.log(`Soft deleting admin: ${adminId}`);
            
            // Update admin document to mark as deleted/inactive
            await adminsRef.doc(adminId).update({
                isActive: false,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: this.currentUser.uid,
                status: 'deleted'
            });
            
            console.log('Admin marked as deleted successfully');
            
            this.showMessage(`Admin ${adminEmail} has been deactivated successfully. The Firebase Authentication user account remains active but the admin cannot access the system.`, 'success');
            
            // Reload the admins list
            await this.loadAdmins();
            
        } catch (error) {
            console.error('Error soft deleting admin:', error);
            this.handleDeleteError(error);
        }
    }

    async hardDeleteAdmin(adminId, adminEmail) {
        if (!confirm(`HARD DELETE WARNING!\n\nThis will permanently remove admin data for: ${adminEmail}\n\nIMPORTANT NOTES:\n- The Firebase Authentication user will NOT be deleted\n- You must manually delete the user from Firebase Console > Authentication\n- All admin data will be permanently lost\n\nContinue with hard delete?`)) {
            return;
        }

        try {
            console.log(`Hard deleting admin: ${adminId}`);
            
            // Check if current user is authenticated
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }
            
            console.log(`Current user: ${this.currentUser.email}`);
            
            // Delete admin document from Firestore
            await adminsRef.doc(adminId).delete();
            
            console.log('Admin deleted successfully from Firestore');
            
            this.showMessage(`Admin ${adminEmail} has been removed from the database.\n\nIMPORTANT: You must manually delete the Firebase Authentication user:\n1. Go to Firebase Console\n2. Authentication > Users\n3. Find and delete: ${adminEmail}`, 'warning');
            
            // Reload the admins list
            await this.loadAdmins();
            
        } catch (error) {
            console.error('Error hard deleting admin:', error);
            this.handleDeleteError(error);
        }
    }

    handleDeleteError(error) {
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let message = 'Failed to delete admin. ';
        
        if (error.code === 'permission-denied') {
            message += 'You do not have permission to delete this admin. Please ensure you are logged in as SuperAdmin.';
        } else if (error.code === 'not-found') {
            message += 'Admin not found. It may have already been deleted.';
        } else {
            message += error.message || 'Please try again.';
        }
        
        this.showMessage(message, 'error');
    }

    async restoreAdmin(adminId, adminEmail) {
        if (!confirm(`Restore admin access for: ${adminEmail}?\n\nThis will:\n- Reactivate the admin account\n- Allow access to the system\n- Remove deleted status`)) {
            return;
        }

        try {
            console.log(`Restoring admin: ${adminId}`);
            
            // Update admin document to restore access
            await adminsRef.doc(adminId).update({
                isActive: true,
                deletedAt: firebase.firestore.FieldValue.delete(),
                deletedBy: firebase.firestore.FieldValue.delete(),
                status: firebase.firestore.FieldValue.delete(),
                restoredAt: firebase.firestore.FieldValue.serverTimestamp(),
                restoredBy: this.currentUser.uid
            });
            
            console.log('Admin restored successfully');
            
            this.showMessage(`Admin ${adminEmail} has been restored successfully and can now access the system again.`, 'success');
            
            // Reload the admins list
            await this.loadAdmins();
            
        } catch (error) {
            console.error('Error restoring admin:', error);
            this.handleDeleteError(error);
        }
    }

    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email address is already registered.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'permission-denied': 'You do not have permission to perform this action.',
            'unavailable': 'Service is currently unavailable. Please try again later.'
        };

        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }
}

// Global superadmin manager instance  
let superAdminManager;

// Initialize SuperAdmin functionality when page loads
document.addEventListener('DOMContentLoaded', () => {
    superAdminManager = new SuperAdminManager();
});

// Global modal functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Copy feedback URL function
function copyFeedbackUrl() {
    const urlInput = document.getElementById('modal-feedback-url');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        alert('Feedback URL copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy URL:', err);
        alert('Failed to copy URL. Please copy manually.');
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
