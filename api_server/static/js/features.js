// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Modal toggles
    document.getElementById('show-register').addEventListener('click', () => {
        loginModal.classList.add('hidden');
        registerModal.classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', () => {
        registerModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

    // Modal triggers
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
    document.getElementById('register-btn').addEventListener('click', showRegisterModal);

    // Modal close on background click
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            hideModals();
        }
    });

    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            hideModals();
        }
    });

    // Modal close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModals();
        }
    });
}

// Authentication functions
async function checkAuthAndRedirect() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // User is logged in, update UI
            updateAuthenticatedUI();
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            window.location.href = '/dashboard';
        } else {
            alert(data.detail || '로그인에 실패했습니다.');
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
            registerModal.classList.add('hidden');
            loginModal.classList.remove('hidden');
        } else {
            alert(data.detail || '회원가입에 실패했습니다.');
        }
    } catch (error) {
        console.error('Register failed:', error);
        alert('회원가입 중 오류가 발생했습니다.');
    }
}

// UI functions
function showLoginModal() {
    loginModal.classList.remove('hidden');
}

function showRegisterModal() {
    registerModal.classList.remove('hidden');
}

function hideModals() {
    loginModal.classList.add('hidden');
    registerModal.classList.add('hidden');
}

function updateAuthenticatedUI() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = '대시보드';
        loginBtn.onclick = () => window.location.href = '/dashboard';
    }
}