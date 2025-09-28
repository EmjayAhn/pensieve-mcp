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
    initializeAnimations();
    setupScrollIndicators();
    // setupScrollSnap(); // Removed - just use natural scrolling
});

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Modal toggles
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            if (loginModal) loginModal.classList.add('hidden');
            if (registerModal) registerModal.classList.remove('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            if (registerModal) registerModal.classList.add('hidden');
            if (loginModal) loginModal.classList.remove('hidden');
        });
    }

    // Landing page buttons
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const ctaRegisterBtn = document.getElementById('cta-register-btn');

    if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
    if (registerBtn) registerBtn.addEventListener('click', showRegisterModal);
    if (getStartedBtn) getStartedBtn.addEventListener('click', showRegisterModal);
    if (ctaRegisterBtn) ctaRegisterBtn.addEventListener('click', showRegisterModal);

    // Modal close on background click
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                hideModals();
            }
        });
    }

    if (registerModal) {
        registerModal.addEventListener('click', (e) => {
            if (e.target === registerModal) {
                hideModals();
            }
        });
    }

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
    if (!token) return; // Stay on landing page

    try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // User is logged in, redirect to dashboard
            window.location.href = '/dashboard';
        } else {
            // Invalid token, remove it
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
            // Redirect to dashboard
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

// Initialize animations
function initializeAnimations() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 100
        });
    }
}

// Setup scroll indicators and navigation
function setupScrollIndicators() {
    const sections = document.querySelectorAll('section[id]');
    const indicators = document.querySelectorAll('.indicator-dot');
    const navbar = document.getElementById('navbar');

    // Handle scroll events for fixed navigation
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;

        // Update navigation background
        if (scrollTop > 100) {
            navbar.classList.add('nav-fixed');
        } else {
            navbar.classList.remove('nav-fixed');
        }

        // Update active section indicator
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollTop >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        indicators.forEach((indicator) => {
            indicator.classList.remove('active');
            if (indicator.dataset.section == getSectionIndex(current)) {
                indicator.classList.add('active');
            }
        });
    });

    // Handle indicator clicks
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            const sectionId = getSectionId(index);
            if (sectionId) {
                document.getElementById(sectionId).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

function getSectionIndex(sectionId) {
    const sectionMap = {
        'hero': 0,
        'features': 1,
        'how-it-works': 2,
        'cta': 3
    };
    return sectionMap[sectionId] || 0;
}

function getSectionId(index) {
    const sections = ['hero', 'features', 'how-it-works', 'cta'];
    return sections[index];
}

// Setup scroll snap functionality
function setupScrollSnap() {
    const sections = document.querySelectorAll('.section-full');
    let currentSection = 0;

    // Keyboard navigation only
    document.addEventListener('keydown', (e) => {
        // Check if modals are open - if so, don't handle scroll navigation
        if (!loginModal.classList.contains('hidden') || !registerModal.classList.contains('hidden')) {
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            scrollToSection(currentSection + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            scrollToSection(currentSection - 1);
        } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToSection(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            scrollToSection(sections.length - 1);
        }
    });

    function scrollToSection(index) {
        if (index < 0 || index >= sections.length) return;

        currentSection = index;
        sections[currentSection].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Update indicators
        document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSection);
        });
    }

    // Update current section on scroll using Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                const sectionId = entry.target.getAttribute('id');
                currentSection = getSectionIndex(sectionId);

                // Update indicators
                document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentSection);
                });
            }
        });
    }, {
        threshold: 0.5
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}