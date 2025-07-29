// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyDG2W0KOMdNxu-o0wX7wrJFVnEn6rWtyUM",
    authDomain: "guestpulse-87c8d.firebaseapp.com",
    projectId: "guestpulse-87c8d",
    storageBucket: "guestpulse-87c8d.firebasestorage.app",
    messagingSenderId: "78471484531",
    appId: "1:78471484531:web:6f318b5a9ce28d6db5c606"
};

console.log("Initializing Firebase with config:", JSON.stringify(firebaseConfig));

try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Disable app verification for testing
    firebase.auth().settings.appVerificationDisabledForTesting = true; // For development only
    
    // Add extra debugging settings
    firebase.firestore().settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    // Enable persistence to help with connection issues
    firebase.firestore().enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log("Firestore persistence enabled successfully");
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time");
            } else if (err.code === 'unimplemented') {
                console.warn("Current browser doesn't support persistence");
            } else {
                console.error("Error enabling persistence:", err);
            }
        });
        
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Failed to initialize Firebase. Please check console for details.");
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Collection references
const hotelsCollection = db.collection('hotels');
const feedbackCollection = db.collection('feedback');
const usersCollection = db.collection('users');
// Public access collection - same as hotels but with different security rules
const publicHotelsCollection = db.collection('public_hotels');

// Current user state
let currentUser = null;
let currentHotel = null;

// Sync existing hotels to public collection on app startup
function syncHotelsToPublic() {
    console.log("Syncing hotels to public collection...");
    hotelsCollection.get().then(snapshot => {
        if (snapshot.empty) return;
        
        const batch = db.batch();
        let syncCount = 0;
        
        snapshot.forEach(doc => {
            const hotel = doc.data();
            const publicData = {
                hotelName: hotel.hotelName,
                logoUrl: hotel.logoUrl || 'images/hotel-logo.png',
                description: hotel.description || '',
                primaryColor: hotel.primaryColor || CONFIG.defaultSettings.primaryColor,
                secondaryColor: hotel.secondaryColor || CONFIG.defaultSettings.secondaryColor,
                createdAt: hotel.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            batch.set(publicHotelsCollection.doc(doc.id), publicData, { merge: true });
            syncCount++;
        });
        
        return batch.commit().then(() => {
            console.log(`Synced ${syncCount} hotels to public collection`);
        });
    }).catch(error => {
        console.error("Error syncing hotels to public collection:", error);
    });
}

// Run the sync on app startup (after a short delay to let other initialization complete)
setTimeout(syncHotelsToPublic, 3000);

// Authentication state observer with enhanced debugging and auto document creation
auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? `User ${user.email} logged in` : "User logged out");
    
    // Check if there's a hotel parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const hotelIdFromUrl = urlParams.get('hotel');
    
    if (user) {
        currentUser = user;
        console.log(`Attempting to fetch user role for UID: ${user.uid}`);
        
        // Check if the user is a super admin
        usersCollection.doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    console.log(`User document found. Role: ${userData.role}`);
                    
                    // If there's a hotel parameter in the URL, prioritize loading that hotel
                    if (hotelIdFromUrl) {
                        console.log(`Hotel ID found in URL: ${hotelIdFromUrl}. Loading hotel data...`);
                        return loadHotelData(hotelIdFromUrl);
                    }
                    
                    // No hotel in URL, proceed with normal role-based routing
                    if (userData.role === 'superAdmin') {
                        console.log("Super admin login detected, showing super admin panel");
                        // Handle super admin login
                        showSuperAdminPanel();
                    } else if (userData.role === 'hotelAdmin') {
                        console.log(`Hotel admin login detected for hotel: ${userData.hotelId}`);
                        // Handle hotel admin login
                        loadHotelData(userData.hotelId);
                    } else {
                        console.warn(`Unknown user role: ${userData.role}`);
                    }
                } else {
                    console.warn(`No user document found for UID: ${user.uid}, attempting to create one based on email domain`);
                    
                    // Try to create a user document based on email
                    const email = user.email || '';
                    
                    // Check if it's the default super admin email
                    if (email === CONFIG.defaultSuperAdmin.email) {
                        // Create a super admin document
                        console.log("Creating super admin document for default admin");
                        usersCollection.doc(user.uid).set({
                            email: email,
                            name: "Super Admin",
                            role: "superAdmin",
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                        .then(() => {
                            console.log("Super admin document created, refreshing page");
                            alert("Initial super admin account created. Please log in again.");
                            window.location.reload();
                        })
                        .catch(error => {
                            console.error("Error creating super admin document:", error);
                            alert("Error creating user document: " + error.message);
                        });
                    } else {
                        console.error(`No user document found for UID: ${user.uid} and not a default admin`);
                        
                        // We could add logic here to handle new hotel admins or other users,
                        // but it's generally better to create these explicitly for security
                        
                        alert("User document not found. Please contact the administrator.");
                        
                        // Sign the user out to prevent them from being stuck
                        auth.signOut().then(() => {
                            console.log("User signed out due to missing document");
                        });
                    }
                }
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
                alert(`Error fetching user data: ${error.message}`);
            });
    } else {
        currentUser = null;
        currentHotel = null;
        console.log("User logged out or no user signed in");
    }
});

// Load hotel data
function loadHotelData(hotelId) {
    // Use different collection based on authentication status to match security rules
    const collection = auth.currentUser ? hotelsCollection : publicHotelsCollection;
    
    return collection.doc(hotelId).get()
        .then((doc) => {
            if (doc.exists) {
                currentHotel = {
                    id: doc.id,
                    ...doc.data()
                };
                return currentHotel;
            } else {
                // If not found in the first collection and we're using publicHotelsCollection, try the main collection
                if (!auth.currentUser && collection === publicHotelsCollection) {
                    console.log("Hotel not found in public collection, trying main collection...");
                    return hotelsCollection.doc(hotelId).get()
                        .then((mainDoc) => {
                            if (mainDoc.exists) {
                                currentHotel = {
                                    id: mainDoc.id,
                                    ...mainDoc.data()
                                };
                                return currentHotel;
                            } else {
                                console.error("No hotel found with ID:", hotelId);
                                return null;
                            }
                        })
                        .catch((fallbackError) => {
                            console.error("Error in fallback hotel data fetch:", fallbackError);
                            return null;
                        });
                } else {
                    console.error("No hotel found with ID:", hotelId);
                    return null;
                }
            }
        })
        .catch((error) => {
            console.error("Error loading hotel data:", error);
            
            // If permission error and we're not using public collection already, try public collection
            if (error.code === "permission-denied" && auth.currentUser && collection !== publicHotelsCollection) {
                console.log("Permission denied, trying public collection instead...");
                return publicHotelsCollection.doc(hotelId).get()
                    .then((publicDoc) => {
                        if (publicDoc.exists) {
                            currentHotel = {
                                id: publicDoc.id,
                                ...publicDoc.data()
                            };
                            return currentHotel;
                        } else {
                            console.error("No hotel found in public collection with ID:", hotelId);
                            return null;
                        }
                    })
                    .catch((publicError) => {
                        console.error("Error loading from public hotel data:", publicError);
                        return null;
                    });
            }
            
            return null;
        });
}

// Save feedback to Firestore
function saveFeedback(feedbackData) {
    return feedbackCollection.add({
        ...feedbackData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hotelId: currentHotel ? currentHotel.id : null
    })
    .then((docRef) => {
        console.log("Feedback saved with ID:", docRef.id);
        return docRef.id;
    })
    .catch((error) => {
        console.error("Error saving feedback:", error);
        throw error;
    });
}

// Authentication functions with enhanced debugging
const firebaseAuth = {
    // Sign in with email and password
    signIn: function(email, password) {
        console.log(`Attempting to sign in user: ${email}`);
        return auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log(`User signed in successfully: ${userCredential.user.uid}`);
                return userCredential;
            })
            .catch(error => {
                console.error(`Login error (${error.code}): ${error.message}`);
                // Check for common errors and provide more helpful messages
                if (error.code === 'auth/network-request-failed') {
                    console.warn("Network error detected. Check if any browser extensions are blocking Firebase requests.");
                }
                throw error; // Re-throw for handling in UI
            });
    },
    
    // Sign out
    signOut: function() {
        console.log("Attempting to sign out user");
        return auth.signOut()
            .then(() => {
                console.log("User signed out successfully");
            })
            .catch(error => {
                console.error(`Sign out error: ${error.message}`);
                throw error;
            });
    },
    
    // Create a new hotel admin (for super admin)
    createHotelAdmin: function(email, password, hotelId, hotelName) {
        console.log(`Creating new hotel admin: ${email} for hotel: ${hotelName} (${hotelId})`);
        
        // Validate required parameters
        if (!email || !password || !hotelId || !hotelName) {
            console.error("Missing required parameters for creating hotel admin");
            return Promise.reject(new Error("Missing required parameters for creating hotel admin"));
        }
        
        // Validate password length (Firebase requires at least 6 characters)
        if (password.length < 6) {
            console.error("Password must be at least 6 characters long");
            return Promise.reject(new Error("Password must be at least 6 characters long"));
        }
        
        let newUserUID = null;
        
        // This should be done through Firebase Functions for security
        // This is a simplified example
        return auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                newUserUID = userCredential.user.uid;
                console.log(`Admin user created, UID: ${newUserUID}`);
                
                // Create the user document with all required fields
                return usersCollection.doc(newUserUID).set({
                    uid: newUserUID,
                    email: email,
                    role: 'hotelAdmin',
                    hotelId: hotelId,
                    hotelName: hotelName,
                    name: hotelName + " Admin", // More descriptive name
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: null
                });
            })
            .then(() => {
                console.log("Hotel admin document created in Firestore");
                
                // Verify the document was created
                return usersCollection.doc(newUserUID).get();
            })
            .then((docSnapshot) => {
                if (docSnapshot.exists) {
                    console.log("Verified hotel admin document exists in Firestore");
                    // Return an object with both the user UID and data for easier reference
                    return {
                        uid: newUserUID,
                        email: email,
                        hotelId: hotelId,
                        hotelName: hotelName
                    };
                } else {
                    throw new Error("Failed to verify hotel admin document creation");
                }
            })
            .catch(error => {
                console.error(`Error creating hotel admin: ${error.message}`);
                
                // If there was an error but the auth user was created, attempt to clean up
                if (newUserUID) {
                    console.warn(`Attempting to clean up partially created admin user: ${newUserUID}`);
                    auth.currentUser.delete().catch(e => 
                        console.error("Failed to clean up auth user after Firestore error:", e)
                    );
                }
                
                throw error;
            });
    },
    
    // Create a new hotel (for super admin)
    createHotel: function(hotelData) {
        return hotelsCollection.add({
            ...hotelData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(hotelRef => {
            // Also create a public version with limited data
            const publicData = {
                hotelName: hotelData.hotelName,
                logoUrl: hotelData.logoUrl || 'images/hotel-logo.png',
                description: hotelData.description || '',
                primaryColor: hotelData.primaryColor || CONFIG.defaultSettings.primaryColor,
                secondaryColor: hotelData.secondaryColor || CONFIG.defaultSettings.secondaryColor,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Save the same data to public collection with same ID
            return publicHotelsCollection.doc(hotelRef.id).set(publicData)
                .then(() => {
                    console.log(`Hotel data also saved to public collection with ID: ${hotelRef.id}`);
                    return hotelRef;
                })
                .catch(error => {
                    console.error("Error saving to public collection:", error);
                    return hotelRef;  // Still return the original ref even if public sync fails
                });
        });
    }
};

// For the Super Admin panel with enhanced debugging
function showSuperAdminPanel() {
    console.log("Showing super admin panel");
    
    // Check if we're trying to view a specific hotel
    const urlParams = new URLSearchParams(window.location.search);
    const hotelIdFromUrl = urlParams.get('hotel');
    
    // If there's a hotel parameter and we're a super admin, give the option to view as guest
    if (hotelIdFromUrl && auth.currentUser) {
        // Only ask once per session
        const viewChoice = sessionStorage.getItem('superAdminViewChoice');
        
        if (viewChoice === 'guest') {
            console.log("Super admin chose to view hotel as guest, redirecting...");
            // Just show hotel view instead
            if (document.getElementById('super-admin-panel')) {
                document.getElementById('super-admin-panel').style.display = 'none';
            }
            return;
        } else if (!viewChoice) {
            // Ask user preference
            const viewAsGuest = confirm('You are logged in as Super Admin viewing a specific hotel. Do you want to view this hotel as a guest would see it? Click Cancel to see the Super Admin panel instead.');
            
            if (viewAsGuest) {
                // Store preference
                sessionStorage.setItem('superAdminViewChoice', 'guest');
                
                // Hide admin panel, let app.js show guest view
                if (document.getElementById('super-admin-panel')) {
                    document.getElementById('super-admin-panel').style.display = 'none';
                }
                return;
            } else {
                // Remember choice
                sessionStorage.setItem('superAdminViewChoice', 'admin');
            }
        }
    }
    
    // Show the panel UI first (so the user sees something happening)
    if (document.getElementById('super-admin-panel')) {
        document.getElementById('super-admin-panel').style.display = 'block';
        
        // Hide any guest UI that might be showing
        document.getElementById('feedback-form').style.display = 'none';
    } else {
        console.error("Super admin panel element not found in the DOM");
    }
    
    console.log("Fetching hotels data for super admin");
    
    // Fetch all hotels
    hotelsCollection.get()
        .then((snapshot) => {
            console.log(`Fetched ${snapshot.size} hotels`);
            const hotels = [];
            snapshot.forEach((doc) => {
                hotels.push({ id: doc.id, ...doc.data() });
            });
            
            // Display in super admin interface
            if (window.handleSuperAdminData) {
                console.log("Calling handleSuperAdminData with hotels data");
                window.handleSuperAdminData(hotels);
            } else {
                console.warn("handleSuperAdminData function not available in window scope");
            }
        })
        .catch((error) => {
            console.error("Error fetching hotels for super admin:", error);
            alert(`Error loading hotels: ${error.message}. Check console for details.`);
        });
    
    // Update user info in UI
    if (currentUser && document.getElementById('super-admin-email')) {
        document.getElementById('super-admin-email').textContent = currentUser.email;
    }
}
