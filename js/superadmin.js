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
        card.className = 'admin-item';
        
        const createdDate = admin.createdAt ? 
            admin.createdAt.toDate().toLocaleDateString() : 
            'Unknown';

        card.innerHTML = `
            <div class="admin-item-header">
                <span class="admin-email">${admin.email}</span>
                <span class="admin-role">${admin.role}</span>
                <button class="btn btn-danger btn-small delete-admin-btn" onclick="superAdminManager.deleteAdmin('${adminId}', '${admin.email}')">
                    Delete
                </button>
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
                    <span class="detail-label">Notification Email</span>
                    <span class="detail-value">${admin.notificationEmail || 'Not provided'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created Date</span>
                    <span class="detail-value">${createdDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Image URL</span>
                    <span class="detail-value">${admin.hotelImageURL || 'Default'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${admin.isActive ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            ${admin.hotelDescription ? `
                <div class="admin-description">
                    <span class="detail-label">Description</span>
                    <p>${admin.hotelDescription}</p>
                </div>
            ` : ''}
        `;

        return card;
    }

    showMessage(message, type = 'success') {
        const messageElement = document.getElementById('create-admin-message');
        if (messageElement) {
            showMessage(messageElement, message, type);
        }
    }

    async deleteAdmin(adminId, adminEmail) {
        if (!confirm(`Are you sure you want to delete admin: ${adminEmail}?\n\nThis will:\n- Delete the admin account\n- Remove all associated data\n- This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete admin document from Firestore
            await adminsRef.doc(adminId).delete();
            
            // Note: In a production environment, you would also want to delete the Firebase Auth user
            // This requires Firebase Admin SDK on the backend
            
            this.showMessage('Admin deleted successfully', 'success');
            
            // Reload the admins list
            await this.loadAdmins();
            
        } catch (error) {
            console.error('Error deleting admin:', error);
            const message = this.getFirebaseErrorMessage(error.code) || 'Failed to delete admin. Please try again.';
            this.showMessage(message, 'error');
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
