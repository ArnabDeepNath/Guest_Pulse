// Authentication functions
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.setupAuthStateListener();
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                console.log('User logged in:', user.email);
            } else {
                console.log('User logged out');
            }
        });
    }

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Determine user role and redirect
            const role = await this.getUserRole(user.uid);
            this.redirectBasedOnRole(role);
            
            return { success: true, user, role };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async getUserRole(uid) {
        try {
            // Check if user is SuperAdmin
            const superAdminDoc = await superAdminsRef.doc(uid).get();
            if (superAdminDoc.exists) {
                return appConfig.roles.SUPERADMIN;
            }

            // Check if user is Admin
            const adminDoc = await adminsRef.doc(uid).get();
            if (adminDoc.exists) {
                return appConfig.roles.ADMIN;
            }

            return null;
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    }

    redirectBasedOnRole(role) {
        switch (role) {
            case appConfig.roles.SUPERADMIN:
                window.location.href = 'superadmin-dashboard.html';
                break;
            case appConfig.roles.ADMIN:
                window.location.href = 'admin-dashboard.html';
                break;
            default:
                alert('Access denied. Invalid user role.');
                this.logout();
        }
    }

    async checkAuthState() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    async requireAuth() {
        const user = await this.checkAuthState();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    }

    async requireRole(requiredRole) {
        const user = await this.requireAuth();
        if (!user) return null;

        const userRole = await this.getUserRole(user.uid);
        if (userRole !== requiredRole) {
            alert('Access denied. Insufficient permissions.');
            window.location.href = 'login.html';
            return null;
        }

        return { user, role: userRole };
    }
}

// Initialize AuthManager
const authManager = new AuthManager();

// Login form handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authManager.logout();
        });
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    
    // Clear previous error
    errorMessage.style.display = 'none';
    
    // Show loading state
    setButtonLoading(loginBtn, true);
    
    try {
        const result = await authManager.login(email, password);
        
        if (!result.success) {
            showError(errorMessage, result.error);
        }
    } catch (error) {
        console.error('Login handler error:', error);
        showError(errorMessage, 'An unexpected error occurred. Please try again.');
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        button.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showMessage(messageElement, message, type = 'success') {
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}
