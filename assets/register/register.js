// Enhanced register.js with OTP authentication
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

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global state for registration process
let registrationState = {
    currentStep: 1,
    email: '',
    isEmailVerified: false,
    resendTimer: 0,
    resendInterval: null
};

// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateOTP(otp) {
    return /^\d{6}$/.test(otp);
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
        max-width: 350px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ${type === 'success' ? 'background: linear-gradient(135deg, #28a745, #20c997);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #dc3545, #e74c3c);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #17a2b8, #6f42c1);' : ''}
    `;

    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Progress indicator functions
function updateProgressIndicator(step) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((stepEl, index) => {
        if (index + 1 <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(step => {
        step.style.display = 'none';
    });

    // Show current step
    const currentStepElement = document.getElementById(`${getStepId(stepNumber)}-step`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }

    // Update progress indicator
    updateProgressIndicator(stepNumber);
    registrationState.currentStep = stepNumber;
}

function getStepId(stepNumber) {
    const stepIds = ['', 'email', 'otp', 'registration'];
    return stepIds[stepNumber] || 'email';
}

// Resend timer functions
function startResendTimer() {
    registrationState.resendTimer = 60; // 60 seconds
    const resendBtn = document.getElementById('resend-otp-btn');
    const timerSpan = document.getElementById('resend-timer');
    
    resendBtn.disabled = true;
    
    registrationState.resendInterval = setInterval(() => {
        registrationState.resendTimer--;
        timerSpan.textContent = `(${registrationState.resendTimer}s)`;
        
        if (registrationState.resendTimer <= 0) {
            clearInterval(registrationState.resendInterval);
            resendBtn.disabled = false;
            timerSpan.textContent = '';
        }
    }, 1000);
}

// Step 1: Send OTP
async function handleSendOTP() {
    const emailInput = document.getElementById('signup-email');
    const email = emailInput.value.trim();

    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    try {
        showMessage('Sending verification code...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            registrationState.email = email;
            showMessage('Verification code sent to your email!', 'success');
            showStep(2);
            startResendTimer();
        } else {
            showMessage(data.message || 'Failed to send verification code', 'error');
        }

    } catch (error) {
        console.error('Send OTP error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Step 2: Verify OTP
async function handleVerifyOTP() {
    const otpInput = document.getElementById('otp-input');
    const otp = otpInput.value.trim();

    if (!validateOTP(otp)) {
        showMessage('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    try {
        showMessage('Verifying OTP...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: registrationState.email, 
                otp: otp 
            })
        });

        const data = await response.json();

        if (response.ok) {
            registrationState.isEmailVerified = true;
            showMessage('Email verified successfully!', 'success');
            
            // Set verified email in the final step
            document.getElementById('verified-email').value = registrationState.email;
            showStep(3);
        } else {
            showMessage(data.message || 'Invalid or expired OTP', 'error');
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Step 3: Complete Registration
async function handleCompleteRegistration(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const username = formData.get('username')?.trim();
    const password = formData.get('password');

    // Validate inputs
    if (!username || username.length < 3) {
        showMessage('Username must be at least 3 characters long', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    if (!registrationState.isEmailVerified) {
        showMessage('Please verify your email first', 'error');
        return;
    }

    try {
        showMessage('Creating your account...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username, 
                email: registrationState.email, 
                password,
                isEmailVerified: registrationState.isEmailVerified
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('eventica_token', data.token);
            localStorage.setItem('eventica_user', JSON.stringify(data.user));
            showMessage('Account created successfully! Redirecting...', 'success');
            
            form.reset();
            resetRegistrationState();
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }

    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Handle login (existing functionality)
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

// Reset registration state
function resetRegistrationState() {
    registrationState = {
        currentStep: 1,
        email: '',
        isEmailVerified: false,
        resendTimer: 0,
        resendInterval: null
    };
    
    if (registrationState.resendInterval) {
        clearInterval(registrationState.resendInterval);
    }
    
    showStep(1);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Enhanced authentication system with OTP initialized');
    
    // Initialize first step
    showStep(1);
    
    // Get OTP button
    const getOtpBtn = document.getElementById('get-otp-btn');
    if (getOtpBtn) {
        getOtpBtn.addEventListener('click', handleSendOTP);
    }
    
    // Verify OTP button
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', handleVerifyOTP);
    }
    
    // Resend OTP button
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleSendOTP);
    }
    
    // Change email button
    const changeEmailBtn = document.getElementById('change-email-btn');
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', () => {
            resetRegistrationState();
        });
    }
    
    // Sign up form submission
    const signupForm = document.querySelector('.sign-up-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleCompleteRegistration);
        console.log('✅ Signup form with OTP connected');
    }
    
    // Sign in form submission
    const signinForm = document.querySelector('.sign-in-form');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
        console.log('✅ Signin form connected');
    }
    
    // OTP input auto-focus and validation
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', function(e) {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Auto-verify when 6 digits are entered
            if (e.target.value.length === 6) {
                setTimeout(() => {
                    handleVerifyOTP();
                }, 500);
            }
        });
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