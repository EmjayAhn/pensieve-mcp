// API Base URL
const API_BASE_URL = window.location.origin;

// Global state
let currentUser = null;
let conversations = [];
let currentConversation = null;

// DOM Elements
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const conversationsList = document.getElementById('conversations-list');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Main content element
const mainContent = document.querySelector('.max-w-7xl');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupDayjs();
    setupMarkdown();
    checkAuth();
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
    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Search
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

// Authentication functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            showDashboard();
            loadConversations();
        } else {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    conversations = [];
    window.location.href = '/';
}

// UI functions
function showDashboard() {
    usernameSpan.textContent = currentUser?.email || '';
}

// Conversation functions
async function loadConversations() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            conversations = await response.json();
            renderConversations(conversations);
            updateStats();
        } else {
            console.error('Failed to load conversations');
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        conversationsList.innerHTML = `
            <div class="p-6 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>대화를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

function renderConversations(conversations) {
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="p-6 text-center text-gray-500">
                <i class="fas fa-comments text-4xl mb-4"></i>
                <p class="text-lg mb-2">저장된 대화가 없습니다</p>
                <p class="text-sm">Claude MCP를 통해 대화를 저장해보세요!</p>
            </div>
        `;
        return;
    }

    conversationsList.innerHTML = conversations.map(conv => `
        <div class="p-6 hover:bg-gray-50 transition-colors cursor-pointer" onclick="window.location.href='/conversation/${conv.id}'">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h4 class="text-lg font-medium text-gray-900 mb-2">
                        ${conv.metadata?.title || `대화 ${conv.id.slice(0, 8)}`}
                    </h4>
                    <p class="text-sm text-gray-600 mb-2 line-clamp-2">
                        ${getFirstMessage(conv.messages)}
                    </p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                            <i class="fas fa-calendar mr-1"></i>
                            ${formatDate(conv.updated_at)}
                        </span>
                        <span>
                            <i class="fas fa-comment mr-1"></i>
                            ${conv.messages?.length || 0}개 메시지
                        </span>
                        ${conv.metadata?.tags && conv.metadata.tags.length > 0 ? `
                            <span class="flex items-center flex-wrap gap-1">
                                <i class="fas fa-tag mr-1"></i>
                                ${conv.metadata.tags.slice(0, 3).map(tag =>
                                    `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${tag}</span>`
                                ).join('')}
                                ${conv.metadata.tags.length > 3 ?
                                    `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">+${conv.metadata.tags.length - 3}</span>`
                                    : ''
                                }
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalConversations = conversations.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthConversations = conversations.filter(conv => {
        const date = new Date(conv.updated_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const allTags = new Set();
    conversations.forEach(conv => {
        if (conv.metadata?.tags) {
            conv.metadata.tags.forEach(tag => allTags.add(tag));
        }
    });

    document.getElementById('total-conversations').textContent = totalConversations;
    document.getElementById('month-conversations').textContent = monthConversations;
    document.getElementById('total-tags').textContent = allTags.size;
}

// Utility functions
function getFirstMessage(messages) {
    if (!messages || messages.length === 0) return '메시지 없음';
    const firstUserMessage = messages.find(m => m.role === 'user');
    return firstUserMessage ? firstUserMessage.content.slice(0, 100) + '...' : '메시지 없음';
}

function formatDate(dateString) {
    return dayjs.utc(dateString).tz('Asia/Seoul').format('YYYY년 M월 D일 HH:mm');
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
            conversations = conversations.filter(conv => conv.id !== id);
            renderConversations(conversations);
            updateStats();
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

async function handleSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        renderConversations(conversations);
        return;
    }

    const filtered = conversations.filter(conv => {
        const title = conv.metadata?.title || '';
        const tags = conv.metadata?.tags?.join(' ') || '';
        const content = conv.messages?.map(m => m.content).join(' ') || '';

        const searchText = (title + ' ' + tags + ' ' + content).toLowerCase();
        return searchText.includes(query.toLowerCase());
    });

    renderConversations(filtered);
}