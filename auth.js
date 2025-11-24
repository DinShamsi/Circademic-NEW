import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, redirect to dashboard if on login page
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('התחברת בהצלחה!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            showMessage(getErrorMessage(error.code), 'error');
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

        if (password !== passwordConfirm) {
            showMessage('הסיסמאות אינן תואמות', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('הסיסמה חייבת להכיל לפחות 6 תווים', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                institution: '',
                major: '',
                totalCreditsRequired: 120,
                targetAverage: 0,
                categories: ['חובה', 'בחירה', 'כללי', 'ספורט'],
                isWriter: false
            });

            showMessage('נרשמת בהצלחה!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            showMessage(getErrorMessage(error.code), 'error');
        }
    });
}

// Forgot Password Form Handler
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        try {
            await sendPasswordResetEmail(auth, email);
            showMessage('נשלח קישור לאיפוס סיסמה לאימייל שלך', 'success');
        } catch (error) {
            showMessage(getErrorMessage(error.code), 'error');
        }
    });
}

// Google Login
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            // Create new user profile
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName || '',
                email: user.email,
                createdAt: new Date().toISOString(),
                institution: '',
                major: '',
                totalCreditsRequired: 120,
                targetAverage: 0,
                categories: ['חובה', 'בחירה', 'כללי', 'ספורט'],
                isWriter: false
            });
        }

        showMessage('התחברת בהצלחה!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        showMessage(getErrorMessage(error.code), 'error');
    }
};

// Error message handler
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'האימייל כבר בשימוש',
        'auth/invalid-email': 'כתובת אימייל לא תקינה',
        'auth/operation-not-allowed': 'פעולה לא מורשית',
        'auth/weak-password': 'הסיסמה חלשה מדי',
        'auth/user-disabled': 'המשתמש נחסם',
        'auth/user-not-found': 'משתמש לא נמצא',
        'auth/wrong-password': 'סיסמה שגויה',
        'auth/invalid-credential': 'פרטי התחברות שגויים',
        'auth/too-many-requests': 'יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר'
    };
    return errorMessages[errorCode] || 'אירעה שגיאה. נסה שוב';
}

// Show message
function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 9999;
        animation: slideDown 0.3s ease;
        ${type === 'success' ? 'background: #10b981; color: white;' : 'background: #ef4444; color: white;'}
    `;

    document.body.appendChild(messageDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
    }
`;
document.head.appendChild(style);
