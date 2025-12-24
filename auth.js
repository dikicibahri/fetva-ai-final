/**
 * Fetva AI - Firebase Authentication & Database
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQagGmOrDnllJkPd3HxcbleU9jEakkDg4",
    authDomain: "fetva-ai-7fee1.firebaseapp.com",
    projectId: "fetva-ai-7fee1",
    storageBucket: "fetva-ai-7fee1.firebasestorage.app",
    messagingSenderId: "3870347784",
    appId: "1:3870347784:web:62069dd6523bb49eacb7bd",
    measurementId: "G-BT4X8PW5BR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const googleBtn = document.getElementById('google-btn');
const funnyModeCheckbox = document.getElementById('funny-mode');
const toggleFormBtn = document.getElementById('toggle-form');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const submitBtn = document.querySelector('.submit-btn');
const funnyModeWrapper = document.getElementById('funny-mode-wrapper');

let isLoginMode = true;

// Toggle between Login and SignUp
function setupFormToggle() {
    if (!toggleFormBtn) return;

    document.addEventListener('click', (e) => {
        if (e.target.id === 'toggle-form' || e.target.classList.contains('toggle-link')) {
            isLoginMode = !isLoginMode;
            updateFormUI();
        }
    });
}

function updateFormUI() {
    if (isLoginMode) {
        formTitle.textContent = 'Giriş Yap';
        formSubtitle.textContent = 'Hesabınıza erişmek için şifrenizi girin';
        submitBtn.textContent = 'Giriş Yap';
        funnyModeWrapper.style.display = 'none';
        document.querySelector('.toggle-auth').innerHTML =
            'Hesabın yok mu? <span id="toggle-form" class="toggle-link">Kayıt Ol</span>';
    } else {
        formTitle.textContent = 'Kayıt Ol';
        formSubtitle.textContent = 'Yeni bir hesap oluşturun';
        submitBtn.textContent = 'Kayıt Ol';
        funnyModeWrapper.style.display = 'flex';
        document.querySelector('.toggle-auth').innerHTML =
            'Zaten hesabın var mı? <span id="toggle-form" class="toggle-link">Giriş Yap</span>';
    }
}

// Email/Password Auth
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Lütfen bekleyin...';

        try {
            if (isLoginMode) {
                // Login
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                // Sign Up
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);

                // Save user preferences to Firestore
                await db.collection('users').doc(userCredential.user.uid).set({
                    email: email,
                    displayName: email.split('@')[0],
                    funnyMode: funnyModeCheckbox?.checked || false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Redirect to main page
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Auth error:', error);
            let message = 'Bir hata oluştu.';

            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Geçersiz e-posta adresi.';
                    break;
                case 'auth/user-disabled':
                    message = 'Bu hesap devre dışı bırakılmış.';
                    break;
                case 'auth/user-not-found':
                    message = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.';
                    break;
                case 'auth/wrong-password':
                    message = 'Yanlış şifre.';
                    break;
                case 'auth/email-already-in-use':
                    message = 'Bu e-posta zaten kullanımda.';
                    break;
                case 'auth/weak-password':
                    message = 'Şifre en az 6 karakter olmalı.';
                    break;
            }

            alert(message);
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        }
    });
}

// Google Sign-In
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            const result = await auth.signInWithPopup(provider);

            // Check if new user
            if (result.additionalUserInfo?.isNewUser) {
                await db.collection('users').doc(result.user.uid).set({
                    email: result.user.email,
                    displayName: result.user.displayName || result.user.email.split('@')[0],
                    funnyMode: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            window.location.href = 'index.html';

        } catch (error) {
            console.error('Google auth error:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
            }
        }
    });
}

// Check auth state
auth.onAuthStateChanged((user) => {
    // If on login page and already logged in, redirect
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
    }
});

// Initialize
setupFormToggle();
