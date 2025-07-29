document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = {
        // DOM Elements
        elements: {
            // Form elements
            hotelLogo: document.getElementById('hotel-logo'),
            hotelName: document.getElementById('hotel-name'),
            initialQuestion: document.getElementById('initial-question'),
            thankYou: document.getElementById('thank-you'),
            issueForm: document.getElementById('issue-form'),
            submissionConfirmation: document.getElementById('submission-confirmation'),
            confirmationCode: document.getElementById('confirmation-code'),
            everythingGood: document.getElementById('everything-good'),
            haveIssue: document.getElementById('have-issue'),
            issueReportForm: document.getElementById('issue-report-form'),
            currentYear: document.getElementById('current-year'),
            
            // Login elements
            loginPanel: document.getElementById('login-panel'),
            loginEmail: document.getElementById('login-email'),
            loginPassword: document.getElementById('login-password'),
            loginButton: document.getElementById('login-button'),
            loginError: document.getElementById('login-error'),
            
            // Hotel Admin elements
            adminPanel: document.getElementById('admin-panel'),
            adminEmail: document.getElementById('admin-email'),
            adminLogout: document.getElementById('admin-logout'),
            customHotelName: document.getElementById('custom-hotel-name'),
            customLogoUrl: document.getElementById('custom-logo-url'),
            hotelDescription: document.getElementById('hotel-description'),
            primaryColor: document.getElementById('primary-color'),
            secondaryColor: document.getElementById('secondary-color'),
            emailNotifications: document.getElementById('email-notifications'),
            smsNotifications: document.getElementById('sms-notifications'),
            saveSettings: document.getElementById('save-settings'),
            exportQr: document.getElementById('export-qr'),
            qrContainer: document.getElementById('qr-container'),
            qrCode: document.getElementById('qr-code'),
            downloadPng: document.getElementById('download-png'),
            downloadSvg: document.getElementById('download-svg'),
            feedbackTable: document.getElementById('feedback-table'),
            feedbackTableBody: document.getElementById('feedback-table-body'),
            
            // Super Admin elements
            superAdminPanel: document.getElementById('super-admin-panel'),
            superAdminEmail: document.getElementById('super-admin-email'),
            superAdminLogout: document.getElementById('super-admin-logout'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            addHotelBtn: document.getElementById('add-hotel-btn'),
            addAdminBtn: document.getElementById('add-admin-btn'),
            hotelTableBody: document.getElementById('hotel-table-body'),
            adminTableBody: document.getElementById('admin-table-body'),
            platformName: document.getElementById('platform-name'),
            platformLogo: document.getElementById('platform-logo'),
            platformPrimaryColor: document.getElementById('platform-primary-color'),
            platformSecondaryColor: document.getElementById('platform-secondary-color'),
            savePlatformSettings: document.getElementById('save-platform-settings'),
            
            // Add Hotel Modal
            addHotelModal: document.getElementById('add-hotel-modal'),
            newHotelName: document.getElementById('new-hotel-name'),
            newHotelDescription: document.getElementById('new-hotel-description'),
            newHotelLogo: document.getElementById('new-hotel-logo'),
            newHotelAdminEmail: document.getElementById('new-hotel-admin-email'),
            newHotelAdminPassword: document.getElementById('new-hotel-admin-password'),
            newHotelNotificationsEmail: document.getElementById('new-hotel-notifications-email'),
            createHotelBtn: document.getElementById('create-hotel-btn'),
            createHotelError: document.getElementById('create-hotel-error'),
            
            // Modal close buttons
            closeModalButtons: document.querySelectorAll('.close-modal')
        },
        
        // Application settings
        settings: {},
        
        // Current state
        state: {
            currentRole: null,
            currentHotelId: null
        },
        
        // Initialize the app
        init: function() {
            this.setupEventListeners();
            this.setCurrentYear();
            
            // Check URL hash for admin/superadmin access
            this.checkAdminAccess();
            
            // Handle hash changes to detect admin access
            window.addEventListener('hashchange', () => {
                this.checkAdminAccess();
            });
            
            // If URL has hotel parameter and user is not logged in, set the hotel context
            const urlParams = new URLSearchParams(window.location.search);
            const hotelId = urlParams.get('hotel');
            
            if (hotelId && !firebase.auth().currentUser) {
                // Only load hotel directly if no user is logged in
                // Otherwise, the auth state change handler will handle it
                this.loadHotelData(hotelId);
            }
            
            // Check auth state (do this after URL parameter check)
            this.checkAuthState();
            
            // Register handleSuperAdminData globally
            window.handleSuperAdminData = this.handleSuperAdminData.bind(this);
        },
        
        // Check Firebase auth state
        checkAuthState: function() {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User is signed in
                    usersCollection.doc(user.uid).get().then((doc) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            const loginTarget = sessionStorage.getItem('loginTarget') || 'admin';
                            
                            if (userData.role === CONFIG.roles.superAdmin) {
                                this.state.currentRole = CONFIG.appStates.superAdmin;
                                
                                // Show super admin panel if that's what was requested
                                if (loginTarget === 'superadmin') {
                                    this.setupSuperAdminPanel(user, userData);
                                } else {
                                    // For superadmin users, we can show either panel
                                    // If they specifically requested admin panel, show that
                                    // Otherwise default to super admin panel
                                    if (loginTarget === 'admin') {
                                        this.setupHotelAdminPanel(user, userData);
                                    } else {
                                        this.setupSuperAdminPanel(user, userData);
                                    }
                                }
                            } else if (userData.role === CONFIG.roles.hotelAdmin) {
                                this.state.currentRole = CONFIG.appStates.hotelAdmin;
                                this.state.currentHotelId = userData.hotelId;
                                
                                // Hotel admins can only see the hotel admin panel
                                this.setupHotelAdminPanel(user, userData);
                            }
                        }
                    });
                } else {
                    // User is signed out
                    this.state.currentRole = CONFIG.appStates.loggedOut;
                    this.state.currentHotelId = null;
                    
                    // Check if we need to show the login panel (based on URL hash)
                    const hash = window.location.hash.toLowerCase();
                    if (hash === '#admin' || hash === '#superadmin') {
                        this.showLoginPanel();
                    }
                }
            });
        },
        
        // Load hotel data from Firestore
        loadHotelData: function(hotelId) {
            // Determine which collection to use based on authentication status
            const collection = auth.currentUser ? hotelsCollection : publicHotelsCollection;
            
            return collection.doc(hotelId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const hotelData = doc.data();
                        this.settings = hotelData;
                        
                        // Apply hotel branding
                        this.applyHotelBranding(hotelData);
                        
                        // Hide any admin panels that might be showing
                        if (auth.currentUser) {
                            // If logged in as admin, check their role
                            usersCollection.doc(auth.currentUser.uid).get().then(userDoc => {
                                if (userDoc.exists) {
                                    const userData = userDoc.data();
                                    
                                    // Show appropriate panel based on role
                                    if (userData.role === 'hotelAdmin' && userData.hotelId === hotelId) {
                                        // Admin for this hotel - show admin panel
                                        if (this.elements.adminPanel) {
                                            this.elements.adminPanel.style.display = 'block';
                                        }
                                    } else if (userData.role === 'superAdmin') {
                                        // Super admin viewing a hotel - can choose to show guest form or admin view
                                        const viewAsGuest = confirm('You are logged in as Super Admin. Do you want to view this hotel as a guest? Click Cancel to see the Super Admin panel instead.');
                                        
                                        if (viewAsGuest) {
                                            // Hide admin panels, show guest form
                                            if (this.elements.superAdminPanel) {
                                                this.elements.superAdminPanel.style.display = 'none';
                                            }
                                            // Show the feedback form for guests
                                            document.getElementById('feedback-form').style.display = 'block';
                                            document.querySelector('.container').style.display = 'block';
                                        } else {
                                            // Show super admin panel instead
                                            showSuperAdminPanel();
                                        }
                                    } else {
                                        // Not an admin for this hotel - show guest form
                                        document.getElementById('feedback-form').style.display = 'block';
                                        document.querySelector('.container').style.display = 'block';
                                    }
                                }
                            });
                        } else {
                            // Not logged in - always show guest form
                            document.getElementById('feedback-form').style.display = 'block';
                            document.querySelector('.container').style.display = 'block';
                        }
                        
                        return hotelData;
                    } else {
                        console.error("No hotel found with ID:", hotelId);
                        alert('Hotel not found. Please check the URL and try again.');
                        return null;
                    }
                })
                .catch((error) => {
                    console.error("Error loading hotel data:", error);
                    
                    // If we hit a permissions error, try the public collection instead
                    if (error.code === "permission-denied") {
                        console.log("Permission denied, trying public collection...");
                        return publicHotelsCollection.doc(hotelId).get()
                            .then((publicDoc) => {
                                if (publicDoc.exists) {
                                    const hotelData = publicDoc.data();
                                    this.settings = hotelData;
                                    
                                    // Apply hotel branding
                                    this.applyHotelBranding(hotelData);
                                    
                                    // Show the guest form
                                    document.getElementById('feedback-form').style.display = 'block';
                                    document.querySelector('.container').style.display = 'block';
                                    
                                    return hotelData;
                                } else {
                                    console.error("No hotel found in public collection with ID:", hotelId);
                                    alert('Hotel not found. Please check the URL and try again.');
                                    return null;
                                }
                            })
                            .catch((publicError) => {
                                console.error("Error loading from public hotel data:", publicError);
                                alert('Error loading hotel data. Please try again later.');
                                return null;
                            });
                    } else {
                        alert('Error loading hotel data. Please try again later.');
                        return null;
                    }
                });
        },
        
        // Apply hotel branding
        applyHotelBranding: function(hotelData) {
            if (this.elements.hotelName) {
                this.elements.hotelName.textContent = hotelData.hotelName || CONFIG.defaultSettings.hotelName;
            }
            
            if (this.elements.hotelLogo && hotelData.logoUrl) {
                this.elements.hotelLogo.src = hotelData.logoUrl;
            }
            
            // Apply theme colors
            const primaryColor = hotelData.primaryColor || CONFIG.defaultSettings.primaryColor;
            const secondaryColor = hotelData.secondaryColor || CONFIG.defaultSettings.secondaryColor;
            
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        },
        
        // Set up Super Admin panel
        setupSuperAdminPanel: function(user, userData) {
            if (this.elements.superAdminEmail) {
                this.elements.superAdminEmail.textContent = user.email;
            }
            
            // Show the panel
            if (this.elements.superAdminPanel) {
                this.elements.superAdminPanel.style.display = 'block';
            }
            
            // Load platform settings
            db.collection('platform').doc('settings').get()
                .then((doc) => {
                    if (doc.exists) {
                        const platformData = doc.data();
                        
                        if (this.elements.platformName) {
                            this.elements.platformName.value = platformData.name || 'GuestPulse LIVE';
                        }
                        
                        if (this.elements.platformLogo) {
                            this.elements.platformLogo.value = platformData.logoUrl || '';
                        }
                        
                        if (this.elements.platformPrimaryColor) {
                            this.elements.platformPrimaryColor.value = platformData.primaryColor || CONFIG.defaultSettings.primaryColor;
                        }
                        
                        if (this.elements.platformSecondaryColor) {
                            this.elements.platformSecondaryColor.value = platformData.secondaryColor || CONFIG.defaultSettings.secondaryColor;
                        }
                    }
                });
            
            // Load hotels
            this.loadHotelsList();
            
            // Load admins
            this.loadAdminsList();
        },
        
        // Set up Hotel Admin panel
        setupHotelAdminPanel: function(user, userData) {
            if (this.elements.adminEmail) {
                this.elements.adminEmail.textContent = user.email;
            }
            
            // Show the panel
            if (this.elements.adminPanel) {
                this.elements.adminPanel.style.display = 'block';
            }
            
            // Load hotel data
            if (userData.hotelId) {
                hotelsCollection.doc(userData.hotelId).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const hotelData = doc.data();
                            
                            if (this.elements.customHotelName) {
                                this.elements.customHotelName.value = hotelData.hotelName || '';
                            }
                            
                            if (this.elements.customLogoUrl) {
                                this.elements.customLogoUrl.value = hotelData.logoUrl || '';
                            }
                            
                            if (this.elements.hotelDescription) {
                                this.elements.hotelDescription.value = hotelData.description || '';
                            }
                            
                            if (this.elements.primaryColor) {
                                this.elements.primaryColor.value = hotelData.primaryColor || CONFIG.defaultSettings.primaryColor;
                            }
                            
                            if (this.elements.secondaryColor) {
                                this.elements.secondaryColor.value = hotelData.secondaryColor || CONFIG.defaultSettings.secondaryColor;
                            }
                            
                            if (this.elements.emailNotifications) {
                                this.elements.emailNotifications.value = hotelData.emailNotifications || '';
                            }
                            
                            if (this.elements.smsNotifications) {
                                this.elements.smsNotifications.value = hotelData.smsNotifications || '';
                            }
                            
                            // Load feedback for this hotel
                            this.loadHotelFeedback(userData.hotelId);
                        }
                    });
            }
        },
        
        // Load hotels list for super admin
        loadHotelsList: function() {
            if (!this.elements.hotelTableBody) return;
            
            this.elements.hotelTableBody.innerHTML = '';
            
            hotelsCollection.get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        this.elements.hotelTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" class="text-center">No hotels found</td>
                            </tr>
                        `;
                        return;
                    }
                    
                    snapshot.forEach((doc) => {
                        const hotel = doc.data();
                        const hotelId = doc.id;
                        const timestamp = hotel.createdAt ? hotel.createdAt.toDate() : new Date();
                        const date = timestamp.toLocaleDateString();
                        
                        // Create row elements
                        const row = document.createElement('tr');
                        
                        // Hotel name cell
                        const nameCell = document.createElement('td');
                        nameCell.textContent = hotel.hotelName;
                        row.appendChild(nameCell);
                        
                        // Admin email cell
                        const emailCell = document.createElement('td');
                        emailCell.textContent = hotel.adminEmail || 'Not assigned';
                        row.appendChild(emailCell);
                        
                        // Created date cell
                        const dateCell = document.createElement('td');
                        dateCell.textContent = date;
                        row.appendChild(dateCell);
                        
                        // Guest access URL cell
                        const linkCell = document.createElement('td');
                        const linkInput = document.createElement('input');
                        linkInput.type = 'text';
                        linkInput.className = 'link-text';
                        linkInput.readOnly = true;
                        linkInput.value = `${window.location.origin}${window.location.pathname}?hotel=${hotelId}`;
                        
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'btn btn-small btn-secondary copy-link-btn';
                        copyBtn.textContent = 'Copy';
                        copyBtn.addEventListener('click', () => {
                            linkInput.select();
                            document.execCommand('copy');
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                        });
                        
                        linkCell.appendChild(linkInput);
                        linkCell.appendChild(copyBtn);
                        row.appendChild(linkCell);
                        
                        // Actions cell
                        const actionsCell = document.createElement('td');
                        actionsCell.className = 'table-actions';
                        
                        // Edit button
                        const editBtn = document.createElement('button');
                        editBtn.className = 'table-btn edit-hotel';
                        editBtn.setAttribute('data-id', hotelId);
                        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                        editBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            console.log('Edit hotel:', id);
                            // Handle edit hotel functionality
                        });
                        actionsCell.appendChild(editBtn);
                        
                        // View button
                        const viewBtn = document.createElement('button');
                        viewBtn.className = 'table-btn view-hotel';
                        viewBtn.setAttribute('data-id', hotelId);
                        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
                        viewBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            window.open(`?hotel=${id}`, '_blank');
                        });
                        actionsCell.appendChild(viewBtn);
                        
                        // Delete button
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'table-btn delete delete-hotel';
                        deleteBtn.setAttribute('data-id', hotelId);
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        deleteBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            if (confirm(`Are you sure you want to delete ${hotel.hotelName}? This will delete all associated data and cannot be undone.`)) {
                                console.log('Delete hotel:', id);
                                // Handle delete functionality
                            }
                        });
                        actionsCell.appendChild(deleteBtn);
                        
                        row.appendChild(actionsCell);
                        
                        this.elements.hotelTableBody.appendChild(row);
                    });
                    
                    // Add event listeners
                    document.querySelectorAll('.edit-hotel').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const hotelId = e.currentTarget.getAttribute('data-id');
                            // Handle edit hotel
                            console.log('Edit hotel:', hotelId);
                        });
                    });
                    
                    document.querySelectorAll('.view-hotel').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const hotelId = e.currentTarget.getAttribute('data-id');
                            // Open hotel form in new tab
                            window.open(`?hotel=${hotelId}`, '_blank');
                        });
                    });
                    
                    document.querySelectorAll('.delete-hotel').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const hotelId = e.currentTarget.getAttribute('data-id');
                            // Handle delete hotel
                            if (confirm('Are you sure you want to delete this hotel?')) {
                                this.deleteHotel(hotelId);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Error getting hotels:', error);
                });
        },
        
        // Load admins list for super admin
        loadAdminsList: function() {
            if (!this.elements.adminTableBody) return;
            
            this.elements.adminTableBody.innerHTML = '';
            
            usersCollection.where('role', '!=', 'guest').get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        this.elements.adminTableBody.innerHTML = `
                            <tr>
                                <td colspan="6" class="text-center">No admin users found</td>
                            </tr>
                        `;
                        return;
                    }
                    
                    snapshot.forEach((doc) => {
                        const user = doc.data();
                        const userId = doc.id;
                        const timestamp = user.createdAt ? user.createdAt.toDate() : new Date();
                        const date = timestamp.toLocaleDateString();
                        
                        let hotelName = 'N/A';
                        const role = user.role === 'superAdmin' ? 'Super Admin' : 'Hotel Admin';
                        
                        // Get hotel name if hotel admin
                        if (user.role === 'hotelAdmin' && user.hotelId) {
                            const hotelPromise = hotelsCollection.doc(user.hotelId).get();
                            
                            hotelPromise.then((hotelDoc) => {
                                if (hotelDoc.exists) {
                                    hotelName = hotelDoc.data().hotelName || 'Unknown Hotel';
                                    document.querySelector(`#hotel-name-${userId}`).textContent = hotelName;
                                }
                            });
                        }
                        
                        // Create row elements
                        const row = document.createElement('tr');
                        
                        // Email cell
                        const emailCell = document.createElement('td');
                        emailCell.textContent = user.email;
                        row.appendChild(emailCell);
                        
                        // Role cell
                        const roleCell = document.createElement('td');
                        const roleSpan = document.createElement('span');
                        roleSpan.className = `badge badge-${user.role === 'superAdmin' ? 'primary' : 'success'}`;
                        roleSpan.textContent = role;
                        roleCell.appendChild(roleSpan);
                        row.appendChild(roleCell);
                        
                        // Hotel name cell
                        const hotelCell = document.createElement('td');
                        hotelCell.id = `hotel-name-${userId}`;
                        hotelCell.textContent = hotelName;
                        row.appendChild(hotelCell);
                        
                        // Admin login URL cell
                        const linkCell = document.createElement('td');
                        const linkInput = document.createElement('input');
                        linkInput.type = 'text';
                        linkInput.className = 'link-text';
                        linkInput.readOnly = true;
                        linkInput.value = `${window.location.origin}${window.location.pathname}#admin`;
                        
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'btn btn-small btn-secondary copy-link-btn';
                        copyBtn.textContent = 'Copy';
                        copyBtn.addEventListener('click', () => {
                            linkInput.select();
                            document.execCommand('copy');
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                        });
                        
                        linkCell.appendChild(linkInput);
                        linkCell.appendChild(copyBtn);
                        row.appendChild(linkCell);
                        
                        // Created date cell
                        const dateCell = document.createElement('td');
                        dateCell.textContent = date;
                        row.appendChild(dateCell);
                        
                        // Actions cell
                        const actionsCell = document.createElement('td');
                        actionsCell.className = 'table-actions';
                        
                        // Edit button
                        const editBtn = document.createElement('button');
                        editBtn.className = 'table-btn edit-user';
                        editBtn.setAttribute('data-id', userId);
                        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                        editBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            console.log('Edit user:', id);
                            // Handle edit user functionality
                        });
                        actionsCell.appendChild(editBtn);
                        
                        // Reset password button
                        const resetBtn = document.createElement('button');
                        resetBtn.className = 'table-btn reset-password';
                        resetBtn.setAttribute('data-id', userId);
                        resetBtn.innerHTML = '<i class="fas fa-key"></i>';
                        resetBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            console.log('Reset password for user:', id);
                            // Handle reset password functionality
                        });
                        actionsCell.appendChild(resetBtn);
                        
                        // Delete button
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'table-btn delete delete-user';
                        deleteBtn.setAttribute('data-id', userId);
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        deleteBtn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            if (confirm(`Are you sure you want to delete this admin user? This cannot be undone.`)) {
                                console.log('Delete user:', id);
                                // Handle delete functionality
                            }
                        });
                        actionsCell.appendChild(deleteBtn);
                        
                        row.appendChild(actionsCell);
                        
                        this.elements.adminTableBody.appendChild(row);
                    });
                    
                    // Add event listeners
                    document.querySelectorAll('.edit-user').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const userId = e.currentTarget.getAttribute('data-id');
                            // Handle edit user
                            console.log('Edit user:', userId);
                        });
                    });
                    
                    document.querySelectorAll('.reset-password').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const userId = e.currentTarget.getAttribute('data-id');
                            // Find the email from the row
                            const row = e.currentTarget.closest('tr');
                            const email = row.querySelector('td:first-child').textContent;
                            
                            // Call reset password handler
                            this.handleResetPassword(userId, email);
                        });
                    });
                    
                    document.querySelectorAll('.delete-user').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const userId = e.currentTarget.getAttribute('data-id');
                            // Handle delete user
                            if (confirm('Are you sure you want to delete this user?')) {
                                this.deleteUser(userId);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Error getting admin users:', error);
                });
        },
        
        // Load hotel feedback
        loadHotelFeedback: function(hotelId) {
            if (!this.elements.feedbackTableBody) return;
            
            this.elements.feedbackTableBody.innerHTML = '';
            
            feedbackCollection.where('hotelId', '==', hotelId)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        this.elements.feedbackTableBody.innerHTML = `
                            <tr>
                                <td colspan="6" class="text-center">No feedback received yet</td>
                            </tr>
                        `;
                        return;
                    }
                    
                    snapshot.forEach((doc) => {
                        const feedback = doc.data();
                        const feedbackId = doc.id;
                        const timestamp = feedback.timestamp ? feedback.timestamp.toDate() : new Date();
                        const dateTime = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        
                        const status = feedback.status || 'pending';
                        let statusBadge = '';
                        
                        switch(status) {
                            case 'pending':
                                statusBadge = '<span class="badge badge-warning">Pending</span>';
                                break;
                            case 'inProgress':
                                statusBadge = '<span class="badge badge-primary">In Progress</span>';
                                break;
                            case 'resolved':
                                statusBadge = '<span class="badge badge-success">Resolved</span>';
                                break;
                            default:
                                statusBadge = '<span class="badge badge-warning">Pending</span>';
                        }
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${dateTime}</td>
                            <td>${feedback.roomNumber}</td>
                            <td>${feedback.issueCategory}</td>
                            <td>${feedback.issueDescription.substring(0, 50)}${feedback.issueDescription.length > 50 ? '...' : ''}</td>
                            <td>${statusBadge}</td>
                            <td class="table-actions">
                                <button class="table-btn view-feedback" data-id="${feedbackId}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="table-btn update-status" data-id="${feedbackId}" data-status="${status}">
                                    <i class="fas fa-tasks"></i>
                                </button>
                            </td>
                        `;
                        
                        this.elements.feedbackTableBody.appendChild(row);
                    });
                    
                    // Add event listeners
                    document.querySelectorAll('.view-feedback').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const feedbackId = e.currentTarget.getAttribute('data-id');
                            // Handle view feedback
                            console.log('View feedback:', feedbackId);
                        });
                    });
                    
                    document.querySelectorAll('.update-status').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const feedbackId = e.currentTarget.getAttribute('data-id');
                            const currentStatus = e.currentTarget.getAttribute('data-status');
                            
                            // Simple status rotation
                            let newStatus;
                            switch(currentStatus) {
                                case 'pending':
                                    newStatus = 'inProgress';
                                    break;
                                case 'inProgress':
                                    newStatus = 'resolved';
                                    break;
                                case 'resolved':
                                    newStatus = 'pending';
                                    break;
                                default:
                                    newStatus = 'pending';
                            }
                            
                            this.updateFeedbackStatus(feedbackId, newStatus);
                        });
                    });
                })
                .catch((error) => {
                    console.error('Error getting feedback:', error);
                });
        },
        
        // Update feedback status
        updateFeedbackStatus: function(feedbackId, newStatus) {
            feedbackCollection.doc(feedbackId).update({
                status: newStatus
            })
            .then(() => {
                console.log('Feedback status updated to:', newStatus);
                // Reload feedback list
                if (this.state.currentHotelId) {
                    this.loadHotelFeedback(this.state.currentHotelId);
                }
            })
            .catch((error) => {
                console.error('Error updating feedback status:', error);
                alert('Error updating status: ' + error.message);
            });
        },
        
        // Delete hotel
        deleteHotel: function(hotelId) {
            hotelsCollection.doc(hotelId).delete()
                .then(() => {
                    console.log('Hotel deleted successfully');
                    this.loadHotelsList();
                })
                .catch((error) => {
                    console.error('Error deleting hotel:', error);
                    alert('Error deleting hotel: ' + error.message);
                });
        },
        
        // Delete user
        deleteUser: function(userId) {
            // This would typically be done through Firebase Functions for security
            // This is a simplified example
            usersCollection.doc(userId).delete()
                .then(() => {
                    console.log('User deleted successfully');
                    this.loadAdminsList();
                })
                .catch((error) => {
                    console.error('Error deleting user:', error);
                    alert('Error deleting user: ' + error.message);
                });
        },
        
        // Handle Super Admin data (callback for firebase-init.js)
        handleSuperAdminData: function(hotels) {
            if (this.state.currentRole === CONFIG.appStates.superAdmin) {
                // Display the super admin panel
                if (this.elements.superAdminPanel) {
                    this.elements.superAdminPanel.style.display = 'block';
                }
            }
        },
        
        // Set up event listeners
        setupEventListeners: function() {
            const self = this;
            
            // Initial question buttons
            if (this.elements.everythingGood) {
                this.elements.everythingGood.addEventListener('click', function() {
                    self.showSection(self.elements.thankYou);
                });
            }
            
            if (this.elements.haveIssue) {
                this.elements.haveIssue.addEventListener('click', function() {
                    self.showSection(self.elements.issueForm);
                });
            }
            
            // Issue report form submission
            if (this.elements.issueReportForm) {
                this.elements.issueReportForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    self.handleIssueSubmission();
                });
            }
            
            // Login button
            if (this.elements.loginButton) {
                this.elements.loginButton.addEventListener('click', function() {
                    self.handleLogin();
                });
            }
            
            // Logout buttons
            if (this.elements.adminLogout) {
                this.elements.adminLogout.addEventListener('click', function() {
                    self.handleLogout();
                });
            }
            
            if (this.elements.superAdminLogout) {
                this.elements.superAdminLogout.addEventListener('click', function() {
                    self.handleLogout();
                });
            }
            
            // Save hotel settings
            if (this.elements.saveSettings) {
                this.elements.saveSettings.addEventListener('click', function() {
                    self.saveHotelSettings();
                });
            }
            
            // Save platform settings
            if (this.elements.savePlatformSettings) {
                this.elements.savePlatformSettings.addEventListener('click', function() {
                    self.savePlatformSettings();
                });
            }
            
            // Generate QR code
            if (this.elements.exportQr) {
                this.elements.exportQr.addEventListener('click', function() {
                    self.generateQrCode();
                });
            }
            
            // Download QR as PNG
            if (this.elements.downloadPng) {
                this.elements.downloadPng.addEventListener('click', function() {
                    self.downloadQrAsPng();
                });
            }
            
            // Download QR as SVG
            if (this.elements.downloadSvg) {
                this.elements.downloadSvg.addEventListener('click', function() {
                    self.downloadQrAsSvg();
                });
            }
            
            // Add hotel button
            if (this.elements.addHotelBtn) {
                this.elements.addHotelBtn.addEventListener('click', function() {
                    if (self.elements.addHotelModal) {
                        self.elements.addHotelModal.style.display = 'block';
                    }
                });
            }
            
            // Create hotel button
            if (this.elements.createHotelBtn) {
                this.elements.createHotelBtn.addEventListener('click', function() {
                    self.createNewHotel();
                });
            }
            
            // Tab buttons
            if (this.elements.tabButtons) {
                this.elements.tabButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const tabId = this.getAttribute('data-tab');
                        
                        // Remove active class from all tabs
                        self.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                        self.elements.tabContents.forEach(content => content.classList.remove('active'));
                        
                        // Add active class to selected tab
                        this.classList.add('active');
                        document.getElementById(tabId).classList.add('active');
                    });
                });
            }
            
            // Close modal buttons
            if (this.elements.closeModalButtons) {
                this.elements.closeModalButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const modalId = this.getAttribute('data-target');
                        if (document.getElementById(modalId)) {
                            document.getElementById(modalId).style.display = 'none';
                        }
                    });
                });
            }
            
            // Close modal when clicking outside
            window.addEventListener('click', function(e) {
                if (e.target === self.elements.loginPanel) {
                    self.elements.loginPanel.style.display = 'none';
                }
                
                if (e.target === self.elements.adminPanel) {
                    self.elements.adminPanel.style.display = 'none';
                }
                
                if (e.target === self.elements.superAdminPanel) {
                    self.elements.superAdminPanel.style.display = 'none';
                }
                
                if (e.target === self.elements.addHotelModal) {
                    self.elements.addHotelModal.style.display = 'none';
                }
            });
            
            // Show login panel on Alt+L
            document.addEventListener('keydown', function(e) {
                if (e.altKey && e.key === 'l') {
                    self.showLoginPanel();
                }
            });
            
            // Admin link in footer
            const footerLink = document.querySelector('.footer-link');
            if (footerLink) {
                footerLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    self.showLoginPanel();
                });
            }
        },
        
        // Show login panel
        // Check URL hash for admin/superadmin access
        checkAdminAccess: function() {
            const hash = window.location.hash.toLowerCase();
            
            if (hash === '#admin') {
                // Set a flag for hotel admin login
                sessionStorage.setItem('loginTarget', 'admin');
                
                // Check if user is already logged in
                if (auth.currentUser) {
                    // User is logged in, check their role and redirect
                    usersCollection.doc(auth.currentUser.uid).get().then(doc => {
                        if (doc.exists && doc.data().role === 'hotelAdmin') {
                            // Already logged in as hotel admin, proceed to admin panel
                            console.log("Already logged in as hotel admin");
                            if (doc.data().hotelId) {
                                loadHotelData(doc.data().hotelId);
                            } else {
                                alert("Your admin account is not properly linked to a hotel. Please contact support.");
                            }
                        } else if (doc.exists && doc.data().role === 'superAdmin') {
                            // Super admin can also access hotel admin panel if needed
                            console.log("Super admin accessing hotel admin panel");
                            if (doc.data().hotelId) {
                                loadHotelData(doc.data().hotelId);
                            } else {
                                // Super admin with no assigned hotel shows super admin panel instead
                                showSuperAdminPanel();
                            }
                        } else {
                            // Role mismatch, show login panel
                            this.showLoginPanel();
                        }
                    }).catch(error => {
                        console.error("Error checking user role:", error);
                        this.showLoginPanel();
                    });
                } else {
                    // Not logged in, show login panel
                    this.showLoginPanel();
                }
            } else if (hash === '#superadmin') {
                // Set a flag for super admin login
                sessionStorage.setItem('loginTarget', 'superadmin');
                
                // Show login panel if not already logged in as super admin
                if (auth.currentUser) {
                    usersCollection.doc(auth.currentUser.uid).get().then(doc => {
                        if (doc.exists && doc.data().role === 'superAdmin') {
                            showSuperAdminPanel();
                        } else {
                            this.showLoginPanel();
                        }
                    }).catch(error => {
                        console.error("Error checking user role:", error);
                        this.showLoginPanel();
                    });
                } else {
                    this.showLoginPanel();
                }
            }
        },
        
        showLoginPanel: function() {
            if (this.elements.loginPanel) {
                this.elements.loginPanel.style.display = 'block';
                if (this.elements.loginEmail) {
                    this.elements.loginEmail.focus();
                }
            }
        },
        
        // Handle login with enhanced debugging
        handleLogin: function() {
            const email = this.elements.loginEmail.value.trim();
            const password = this.elements.loginPassword.value;
            
            if (!email || !password) {
                if (this.elements.loginError) {
                    this.elements.loginError.textContent = 'Please enter both email and password';
                }
                return;
            }
            
            // Show loading state
            const originalButtonText = this.elements.loginButton.textContent;
            this.elements.loginButton.textContent = 'Logging in...';
            this.elements.loginButton.disabled = true;
            
            if (this.elements.loginError) {
                this.elements.loginError.textContent = '';
            }
            
            // Attempt login with Firebase
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Login successful');
                    
                    // Hide login panel
                    if (this.elements.loginPanel) {
                        this.elements.loginPanel.style.display = 'none';
                    }
                    
                    // User is now signed in, Firebase auth state change will handle the rest
                })
                .catch((error) => {
                    console.error('Login error:', error);
                    
                    // Show error message
                    if (this.elements.loginError) {
                        this.elements.loginError.textContent = error.message;
                    }
                    
                    // Reset button
                    this.elements.loginButton.textContent = originalButtonText;
                    this.elements.loginButton.disabled = false;
                });
        },
        
        // Reset password for a user
        handleResetPassword: function(userId, email) {
            if (!userId || !email) {
                console.error("Missing required parameters for password reset");
                alert("Error: Missing user information");
                return;
            }
            
            // Generate a secure random password (8 characters)
            const newPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
            
            // Update the user's password
            const user = auth.currentUser;
            if (!user || user.uid !== userId) {
                // For security, only allow super admin to reset passwords
                if (confirm(`Reset password for ${email}? A new temporary password will be provided.`)) {
                    // In a real system, you'd use Firebase Admin SDK or Cloud Functions
                    // This client-side approach is just for demonstration
                    // In production, use a secure server-side function
                    
                    firebase.auth().sendPasswordResetEmail(email)
                        .then(() => {
                            alert(`Password reset email sent to ${email}`);
                        })
                        .catch((error) => {
                            console.error("Error sending password reset email:", error);
                            alert(`Error: ${error.message}`);
                        });
                }
            }
            const loginTarget = sessionStorage.getItem('loginTarget') || 'admin';
            
            console.log(`Login attempt for ${email} with target: ${loginTarget}`);
            
            if (!email || !password) {
                this.elements.loginError.textContent = 'Please enter both email and password';
                return;
            }
            
            // Show loading state
            const originalButtonText = this.elements.loginButton.textContent;
            this.elements.loginButton.textContent = 'Logging in...';
            this.elements.loginButton.disabled = true;
            this.elements.loginError.textContent = '';
            
            // Sign in with Firebase
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log(`Authentication successful for ${email}, checking user document...`);
                    
                    // Check if the user document exists before hiding the login panel
                    return usersCollection.doc(userCredential.user.uid).get().then(doc => {
                        if (doc.exists) {
                            // Close login panel only if the document exists
                            this.elements.loginPanel.style.display = 'none';
                            this.elements.loginPassword.value = '';
                            return userCredential;
                        } else {
                            // If document doesn't exist, we'll let the auth state observer handle it
                            console.log(`No Firestore document found for user ${email} (${userCredential.user.uid})`);
                            // Reset button state but don't hide the panel yet
                            this.elements.loginButton.textContent = originalButtonText;
                            this.elements.loginButton.disabled = false;
                            return userCredential;
                        }
                    });
                })
                .catch((error) => {
                    console.error('Login error:', error.code, error.message);
                    
                    // Check for ERR_BLOCKED_BY_CLIENT specifically
                    if (error.message.includes('network') || error.code === 'auth/network-request-failed') {
                        this.elements.loginError.innerHTML = 'Network error. Please disable ad blockers or privacy extensions that might be blocking Firebase, then try again.';
                    } else {
                        this.elements.loginError.textContent = error.message;
                    }
                    
                    // Reset button state
                    this.elements.loginButton.textContent = originalButtonText;
                    this.elements.loginButton.disabled = false;
                });
        },
        
        // Handle logout
        handleLogout: function() {
            auth.signOut()
                .then(() => {
                    // Close admin panels
                    if (this.elements.adminPanel) {
                        this.elements.adminPanel.style.display = 'none';
                    }
                    
                    if (this.elements.superAdminPanel) {
                        this.elements.superAdminPanel.style.display = 'none';
                    }
                    
                    // Reset state
                    this.state.currentRole = null;
                    this.state.currentHotelId = null;
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                });
        },
        
        // Save hotel settings
        saveHotelSettings: function() {
            if (!this.state.currentHotelId) {
                alert('No hotel selected');
                return;
            }
            
            const hotelData = {
                hotelName: this.elements.customHotelName.value,
                logoUrl: this.elements.customLogoUrl.value,
                description: this.elements.hotelDescription.value,
                primaryColor: this.elements.primaryColor.value,
                secondaryColor: this.elements.secondaryColor.value,
                emailNotifications: this.elements.emailNotifications.value,
                smsNotifications: this.elements.smsNotifications.value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            hotelsCollection.doc(this.state.currentHotelId).update(hotelData)
                .then(() => {
                    // Also update the public collection with limited data
                    const publicData = {
                        hotelName: hotelData.hotelName,
                        logoUrl: hotelData.logoUrl,
                        description: hotelData.description,
                        primaryColor: hotelData.primaryColor,
                        secondaryColor: hotelData.secondaryColor,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Update public collection
                    return publicHotelsCollection.doc(this.state.currentHotelId).update(publicData)
                        .then(() => {
                            console.log('Public hotel data updated successfully');
                            alert('Settings saved successfully');
                            
                            // Apply new branding
                            this.applyHotelBranding(hotelData);
                        })
                        .catch((publicError) => {
                            // If the public document doesn't exist, create it
                            if (publicError.code === 'not-found') {
                                return publicHotelsCollection.doc(this.state.currentHotelId).set(publicData)
                                    .then(() => {
                                        console.log('Created new public hotel document');
                                        alert('Settings saved successfully');
                                        
                                        // Apply new branding
                                        this.applyHotelBranding(hotelData);
                                    });
                            } else {
                                console.error('Error updating public hotel data:', publicError);
                                // Still continue since main data was saved
                                alert('Settings saved successfully (public data update failed)');
                                
                                // Apply new branding
                                this.applyHotelBranding(hotelData);
                            }
                        });
                })
                .catch((error) => {
                    console.error('Error saving hotel settings:', error);
                    alert('Error saving settings: ' + error.message);
                });
        },
        
        // Save platform settings
        savePlatformSettings: function() {
            const platformData = {
                name: this.elements.platformName.value,
                logoUrl: this.elements.platformLogo.value,
                primaryColor: this.elements.platformPrimaryColor.value,
                secondaryColor: this.elements.platformSecondaryColor.value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            db.collection('platform').doc('settings').set(platformData)
                .then(() => {
                    alert('Platform settings saved successfully');
                })
                .catch((error) => {
                    console.error('Error saving platform settings:', error);
                    alert('Error saving settings: ' + error.message);
                });
        },
        
        // Create new hotel
        createNewHotel: function() {
            const hotelName = this.elements.newHotelName.value.trim();
            const description = this.elements.newHotelDescription.value.trim();
            const logoUrl = this.elements.newHotelLogo.value.trim();
            const adminEmail = this.elements.newHotelAdminEmail.value.trim();
            const adminPassword = this.elements.newHotelAdminPassword.value;
            const notificationsEmail = this.elements.newHotelNotificationsEmail.value.trim();
            
            if (!hotelName || !adminEmail || !adminPassword) {
                this.elements.createHotelError.textContent = 'Please fill in all required fields';
                return;
            }
            
            if (adminPassword.length < 6) {
                this.elements.createHotelError.textContent = 'Password must be at least 6 characters';
                return;
            }
            
            // Show loading state
            const originalBtnText = this.elements.createHotelBtn.textContent;
            this.elements.createHotelBtn.textContent = 'Creating...';
            this.elements.createHotelBtn.disabled = true;
            this.elements.createHotelError.textContent = '';
            
            // Create hotel in Firestore
            const hotelData = {
                hotelName,
                description,
                logoUrl: logoUrl || 'images/hotel-logo.png',
                emailNotifications: notificationsEmail || adminEmail,
                primaryColor: CONFIG.defaultSettings.primaryColor,
                secondaryColor: CONFIG.defaultSettings.secondaryColor,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            let hotelRef;
            let adminUid;
            
            hotelsCollection.add(hotelData)
                .then((newHotelRef) => {
                    hotelRef = newHotelRef;
                    console.log(`Created hotel with ID: ${hotelRef.id}`);
                    
                    // Create admin user
                    return auth.createUserWithEmailAndPassword(adminEmail, adminPassword)
                        .then((cred) => {
                            adminUid = cred.user.uid;
                            console.log(`Created hotel admin with UID: ${adminUid}`);
                            
                            // Link user to hotel
                            return usersCollection.doc(adminUid).set({
                                uid: adminUid,
                                email: adminEmail,
                                name: hotelName + " Admin",
                                role: CONFIG.roles.hotelAdmin,
                                hotelId: hotelRef.id,
                                hotelName: hotelName,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                lastLogin: null
                            });
                        })
                        .then(() => {
                            // Update hotel with admin info
                            return hotelRef.update({
                                adminId: adminUid
                            }).then(() => {
                                // Create a public version with limited data for guest access
                                const publicData = {
                                    hotelName: hotelName,
                                    description: description || '',
                                    logoUrl: logoUrl || 'images/hotel-logo.png',
                                    primaryColor: CONFIG.defaultSettings.primaryColor,
                                    secondaryColor: CONFIG.defaultSettings.secondaryColor,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                };
                                
                                return publicHotelsCollection.doc(hotelRef.id).set(publicData);
                            });
                        });
                })
                .then(() => {
                    // Generate shareable links
                    const adminLink = `${window.location.origin}${window.location.pathname}#admin`;
                    const guestLink = `${window.location.origin}${window.location.pathname}?hotel=${hotelRef.id}`;
                    
                    // Show success message with links
                    alert(`Hotel and admin created successfully!\n\nAdmin Login URL: ${adminLink}\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n\nGuest Access URL: ${guestLink}\n\nPlease save this information.`);
                    
                    // Close modal and reset form
                    this.elements.addHotelModal.style.display = 'none';
                    this.elements.newHotelName.value = '';
                    this.elements.newHotelDescription.value = '';
                    this.elements.newHotelLogo.value = '';
                    this.elements.newHotelAdminEmail.value = '';
                    this.elements.newHotelAdminPassword.value = '';
                    this.elements.newHotelNotificationsEmail.value = '';
                    
                    // Reload hotels list
                    this.loadHotelsList();
                })
                .catch((error) => {
                    console.error('Error creating hotel:', error);
                    this.elements.createHotelError.textContent = error.message;
                    
                    // If hotel was created but admin failed, try to clean up
                    if (hotelRef && !adminUid) {
                        hotelRef.delete().catch(e => console.error('Cleanup failed:', e));
                    }
                })
                .finally(() => {
                    // Reset button state
                    this.elements.createHotelBtn.textContent = originalBtnText;
                    this.elements.createHotelBtn.disabled = false;
                });
        },
        
        // Show a specific section and hide others
        showSection: function(sectionToShow) {
            const sections = [
                this.elements.initialQuestion,
                this.elements.thankYou,
                this.elements.issueForm,
                this.elements.submissionConfirmation
            ];
            
            sections.forEach(section => {
                if (section) section.classList.remove('active');
            });
            
            if (sectionToShow) sectionToShow.classList.add('active');
        },
        
        // Handle issue form submission
        handleIssueSubmission: function() {
            // Get form values
            const roomNumber = document.getElementById('room-number').value;
            const issueCategory = document.getElementById('issue-category').value;
            const issueDescription = document.getElementById('issue-description').value;
            const guestName = document.getElementById('guest-name').value || 'Anonymous';
            const guestContact = document.getElementById('guest-contact').value || 'Not provided';
            
            // Get hotel ID from URL or current state
            const urlParams = new URLSearchParams(window.location.search);
            const hotelId = urlParams.get('hotel') || this.state.currentHotelId;
            
            // Create submission object
            const submission = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                roomNumber,
                issueCategory,
                issueDescription,
                guestName,
                guestContact,
                status: 'pending',
                hotelId
            };
            
            // Save to Firestore
            feedbackCollection.add(submission)
                .then((docRef) => {
                    // Show confirmation code
                    this.elements.confirmationCode.textContent = docRef.id;
                    
                    // Get hotel data for notifications
                    if (hotelId) {
                        return hotelsCollection.doc(hotelId).get();
                    }
                    
                    return null;
                })
                .then((hotelDoc) => {
                    if (hotelDoc && hotelDoc.exists) {
                        const hotelData = hotelDoc.data();
                        
                        // Send notification
                        this.sendNotification(submission, hotelData);
                    }
                    
                    // Show confirmation
                    this.showSection(this.elements.submissionConfirmation);
                    
                    // Reset form
                    this.elements.issueReportForm.reset();
                    
                    // Reset to initial question after 10 seconds
                    setTimeout(() => {
                        this.showSection(this.elements.initialQuestion);
                    }, 10000);
                })
                .catch((error) => {
                    console.error('Error saving feedback:', error);
                    alert('Error submitting feedback: ' + error.message);
                });
        },
        
        // Send notification email/SMS
        sendNotification: function(submission, hotelData) {
            // Email notification using EmailJS
            if (CONFIG.emailJs.serviceId && CONFIG.emailJs.templateId && CONFIG.emailJs.userId) {
                const notificationEmail = hotelData ? hotelData.emailNotifications : CONFIG.defaultSettings.emailNotifications;
                
                const templateParams = {
                    to_email: notificationEmail,
                    hotel_name: hotelData ? hotelData.hotelName : 'Your Hotel',
                    room_number: submission.roomNumber,
                    issue_category: submission.issueCategory,
                    issue_description: submission.issueDescription,
                    guest_name: submission.guestName,
                    guest_contact: submission.guestContact,
                    submission_time: new Date().toLocaleString()
                };
                
                emailjs.send(CONFIG.emailJs.serviceId, CONFIG.emailJs.templateId, templateParams)
                    .then(function(response) {
                        console.log('Email notification sent:', response.status, response.text);
                    }, function(error) {
                        console.error('Email notification failed:', error);
                    });
            }
            
            // For SMS, in a real implementation, you would integrate with a service like Twilio
        },
        
        // Generate QR code
        generateQrCode: function() {
            this.elements.qrContainer.classList.remove('hidden');
            this.elements.qrCode.innerHTML = '';
            
            // Get current URL (without hash)
            const currentUrl = window.location.href.split('#')[0];
            
            // Generate QR code
            new QRCode(this.elements.qrCode, {
                text: currentUrl,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        },
        
        // Download QR code as PNG
        downloadQrAsPng: function() {
            const canvas = document.querySelector('#qr-code canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `${this.settings.hotelName.replace(/\s+/g, '-')}-QR.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        },
        
        // Download QR code as SVG (mock function - would need a proper SVG library)
        downloadQrAsSvg: function() {
            alert('SVG export would be implemented with a dedicated QR SVG library in a production environment.');
            
            // In a real implementation, you would convert the QR code to SVG format
            // and trigger a download
        },
        
        // Set the current year in the footer
        setCurrentYear: function() {
            this.elements.currentYear.textContent = new Date().getFullYear();
        }
    };
    
    // Initialize the app
    app.init();
});
