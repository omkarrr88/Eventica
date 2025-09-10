// Enhanced register.js with full authentication
const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

// UI switching
sign_up_btn.addEventListener("click", () => {
    container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode");
});

// FIXED: Correct API Configuration with /api prefix
const API_BASE_URL = 'http://localhost:3000/api'; // For local testing
// const API_BASE_URL = 'https://your-actual-vercel-backend-url.vercel.app/api'; // For production

// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Display messages to user
function showMessage(message, type = 'info') {
    const existingMessages = document.querySelectorAll('.auth-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ${type === 'success' ? 'background: linear-gradient(135deg, #28a745, #20c997);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #dc3545, #e74c3c);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #17a2b8, #6f42c1);' : ''}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Handle registration
async function handleSignup(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const username = formData.get('username')?.trim();
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    
    // Validate inputs
    if (!username || username.length < 3) {
        showMessage('Username must be at least 3 characters long', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    if (!validatePassword(password)) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        showMessage('Creating your account...', 'info');
        
        // FIXED: Correct API route with /api prefix
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('eventica_token', data.token);
            localStorage.setItem('eventica_user', JSON.stringify(data.user));
            
            showMessage('Account created successfully! Redirecting...', 'success');
            form.reset();
            
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Handle login
async function handleSignin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    if (!password) {
        showMessage('Please enter your password', 'error');
        return;
    }
    
    try {
        showMessage('Signing you in...', 'info');
        
        // FIXED: Correct API route with /api prefix
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('eventica_token', data.token);
            localStorage.setItem('eventica_user', JSON.stringify(data.user));
            
            showMessage('Login successful! Redirecting...', 'success');
            form.reset();
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Attach form listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Authentication system initialized');
    
    const signupForm = document.querySelector('.sign-up-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('✅ Signup form connected');
    }
    
    const signinForm = document.querySelector('.sign-in-form');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
        console.log('✅ Signin form connected');
    }
});

// Utility functions
function isLoggedIn() {
    return localStorage.getItem('eventica_token') !== null;
}

function getCurrentUser() {
    const userStr = localStorage.getItem('eventica_user');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('eventica_token');
    localStorage.removeItem('eventica_user');
    showMessage('Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Export functions for global use
window.eventica = {
    isLoggedIn,
    getCurrentUser,
    logout,
    showMessage
};
