// API Base URL
const API_BASE_URL = window.location.origin;

// Global state
let currentUser = null;
let currentConversation = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const backBtn = document.getElementById('back-btn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupDayjs();
    setupMarkdown();
    checkAuthAndLoadConversation();
    setupEventListeners();
});

// Setup dayjs
function setupDayjs() {
    dayjs.extend(dayjs_plugin_utc);
    dayjs.extend(dayjs_plugin_timezone);
}

// Setup markdown renderer
function setupMarkdown() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {}
                }
                return code;
            },
            breaks: true,
            gfm: true
        });
    }
}

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

    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

    // Download and delete buttons
    document.getElementById('download-conversation').addEventListener('click', () => {
        if (currentConversation) {
            downloadConversation(currentConversation._id);
        }
    });

    document.getElementById('delete-conversation').addEventListener('click', () => {
        if (currentConversation) {
            deleteConversation(currentConversation._id);
        }
    });
}

// Get conversation ID from URL
function getConversationIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/conversation\/(.+)$/);
    return match ? match[1] : null;
}

// Authentication functions
async function checkAuthAndLoadConversation() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            await loadConversation();
        } else {
            localStorage.removeItem('token');
            showLoginModal();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginModal();
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
            currentUser = data.user;
            hideModals();
            await loadConversation();
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

function hideModals() {
    loginModal.classList.add('hidden');
    registerModal.classList.add('hidden');
}

// Load conversation
async function loadConversation() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) {
        alert('대화 ID가 없습니다.');
        window.location.href = '/';
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentConversation = await response.json();
            renderConversationDetail(currentConversation);
        } else if (response.status === 404) {
            alert('대화를 찾을 수 없습니다.');
            window.location.href = '/';
        } else {
            alert('대화를 불러오는 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        alert('대화를 불러오는 중 오류가 발생했습니다.');
    }
}

function renderConversationDetail(conversation) {
    // Update title and metadata
    document.getElementById('detail-title').textContent =
        conversation.metadata?.title || `대화 ${conversation._id.slice(0, 8)}`;

    document.getElementById('detail-title-display').textContent =
        conversation.metadata?.title || `대화 ${conversation._id.slice(0, 8)}`;

    document.getElementById('detail-date').textContent =
        formatDate(conversation.updated_at);

    document.getElementById('message-count').textContent =
        conversation.messages?.length || 0;

    // Render tags
    renderDetailTags(conversation.metadata?.tags || []);

    // Render messages
    renderMessages(conversation.messages || []);
}

function renderDetailTags(tags) {
    const tagsContainer = document.getElementById('detail-tags');
    if (tags.length === 0) {
        tagsContainer.innerHTML = '<p class="text-gray-500 text-sm">태그가 없습니다</p>';
        return;
    }

    tagsContainer.innerHTML = tags.map(tag => `
        <span class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            ${tag}
        </span>
    `).join('');
}

function renderMessages(messages) {
    const container = document.getElementById('messages-container');

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500">
                <p>메시지가 없습니다.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map((message, index) => {
        const renderedContent = renderMarkdown(message.content);
        return `
            <div class="p-6">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user'
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-gray-100 text-gray-600'
                        }">
                            <i class="fas ${message.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-2">
                            <h4 class="text-sm font-medium text-gray-900">
                                ${message.role === 'user' ? '사용자' : 'Assistant'}
                            </h4>
                            <span class="text-xs text-gray-500">#${index + 1}</span>
                        </div>
                        <div class="prose prose-sm max-w-none text-gray-700">
                            ${renderedContent}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Highlight code blocks after rendering
    if (typeof hljs !== 'undefined') {
        container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

// Render markdown content
function renderMarkdown(content) {
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(content);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return `<pre class="whitespace-pre-wrap">${escapeHtml(content)}</pre>`;
        }
    }
    // Fallback if marked is not available
    return `<pre class="whitespace-pre-wrap">${escapeHtml(content)}</pre>`;
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Utility functions
function formatDate(dateString) {
    return dayjs.utc(dateString).tz('Asia/Seoul').format('YYYY년 M월 D일 HH:mm');
}

// Conversation actions
async function downloadConversation(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const conversation = await response.json();
            const blob = new Blob([JSON.stringify(conversation, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation-${id.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Download failed:', error);
        alert('다운로드 중 오류가 발생했습니다.');
    }
}

async function deleteConversation(id) {
    if (!confirm('정말로 이 대화를 삭제하시겠습니까?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('대화가 삭제되었습니다.');
            window.location.href = '/';
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}