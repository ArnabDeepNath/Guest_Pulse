// Setup script to create the initial SuperAdmin account
// Run this once to initialize the system

class SystemSetup {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Starting system setup...');
        
        // Check if already initialized
        if (await this.checkIfSuperAdminExists()) {
            console.log('System already initialized. SuperAdmin exists.');
            return;
        }

        await this.createSuperAdmin();
    }

    async checkIfSuperAdminExists() {
        try {
            const snapshot = await superAdminsRef.limit(1).get();
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking SuperAdmin:', error);
            return false;
        }
    }

    async createSuperAdmin() {
        const superAdminEmail = appConfig.defaultSuperAdmin.email;
        const superAdminPassword = appConfig.defaultSuperAdmin.password;

        try {
            console.log('Creating SuperAdmin account...');
            
            // Create authentication account
            const userCredential = await auth.createUserWithEmailAndPassword(
                superAdminEmail, 
                superAdminPassword
            );
            const user = userCredential.user;

            // Store SuperAdmin data in Firestore
            await superAdminsRef.doc(user.uid).set({
                email: superAdminEmail,
                role: appConfig.roles.SUPERADMIN,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true
            });

            console.log('SuperAdmin account created successfully!');
            console.log('Email:', superAdminEmail);
            console.log('Password:', superAdminPassword);
            console.log('Please change the password after first login.');

            // Sign out after creating the account
            await auth.signOut();

        } catch (error) {
            console.error('Error creating SuperAdmin:', error);
            
            if (error.code === 'auth/email-already-in-use') {
                console.log('SuperAdmin email already exists. System may already be initialized.');
            } else {
                throw error;
            }
        }
    }
}

// Auto-run setup when page loads (for development/initialization)
document.addEventListener('DOMContentLoaded', () => {
    // Only run setup in development or if explicitly requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('setup') === 'true' || window.location.hostname === 'localhost') {
        new SystemSetup();
    }
});
