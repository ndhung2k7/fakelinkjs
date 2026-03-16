// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const addAdminBtn = document.getElementById('addAdminBtn');
const addAdminModal = document.getElementById('addAdminModal');
const closeModal = document.querySelector('.close-modal');
const addAdminForm = document.getElementById('addAdminForm');

// Chart instances
let dailyChart, hourlyChart, devicesChart, browsersChart;

// State
let currentPage = 'dashboard';
let linksData = [];
let currentPageNum = 1;
const itemsPerPage = 10;

// Khởi tạo Particles.js
if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#ffffff',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 3,
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'repulse' },
                onclick: { enable: true, mode: 'push' },
                resize: true
            }
        },
        retina_detect: true
    });
}

// Kiểm tra đăng nhập khi load trang
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

// Hiển thị thông báo
function showNotification(message, isError = false) {
    const icon = notification.querySelector('i');
    notificationMessage.textContent = message;
    notification.classList.remove('hidden');
    
    if (isError) {
        icon.className = 'fas fa-exclamation-circle';
        notification.style.background = 'rgba(239, 68, 68, 0.9)';
    } else {
        icon.className = 'fas fa-check-circle';
        notification.style.background = 'rgba(30, 41, 59, 0.95)';
    }
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Kiểm tra trạng thái đăng nhập
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/admin/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            showDashboard(data.admin);
        }
    } catch (error) {
        console.log('Chưa đăng nhập');
    }
}

// Xử lý đăng nhập
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validate
    if (!username || !password) {
        loginError.textContent = 'Vui lòng nhập đầy đủ thông tin';
        loginError.classList.remove('hidden');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showDashboard(data.admin);
            showNotification('Đăng nhập thành công!');
        } else {
            loginError.textContent = data.error || 'Sai tên đăng nhập hoặc mật khẩu';
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        loginError.textContent = 'Lỗi kết nối đến server';
        loginError.classList.remove('hidden');
    }
});

// Hiển thị dashboard
function showDashboard(admin) {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    
    document.getElementById('adminUsername').textContent = admin.username;
    document.getElementById('adminRole').textContent = 
        admin.role === 'superadmin' ? 'Super Admin' : 'Admin';
    
    // Load dữ liệu dashboard
    loadDashboardData();
}

// Xử lý đăng xuất
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        dashboardContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        loginForm.reset();
        loginError.classList.add('hidden');
        
        showNotification('Đã đăng xuất');
    } catch (error) {
        showNotification('Lỗi đăng xuất', true);
    }
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        const page = item.dataset.page;
        switchPage(page);
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

function switchPage(page) {
    currentPage = page;
    
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');
    
    // Load dữ liệu cho trang
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'links':
            loadLinksData();
            break;
        case 'users':
            loadUsersData();
            break;
    }
}

// Load dữ liệu dashboard
async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
            renderCharts(data.stats);
            renderTopLinks(data.stats.topLinks);
        } else {
            showNotification('Không thể tải dữ liệu dashboard', true);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Lỗi tải dữ liệu dashboard', true);
    }
}

// Cập nhật thống kê
function updateDashboardStats(stats) {
    document.getElementById('totalLinks').textContent = stats.totalLinks || 0;
    document.getElementById('totalClicks').textContent = (stats.totalClicks || 0).toLocaleString();
    document.getElementById('uniqueVisitors').textContent = (stats.uniqueVisitors || 0).toLocaleString();
    document.getElementById('todayClicks').textContent = (stats.todayClicks || 0).toLocaleString();
}

// Render charts
function renderCharts(stats) {
    // Daily Chart
    const dailyCtx = document.getElementById('dailyChart')?.getContext('2d');
    if (dailyCtx) {
        if (dailyChart) dailyChart.destroy();
        
        const dailyData = Object.entries(stats.clicksByDay || {})
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .slice(-30);
        
        dailyChart = new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(d => {
                    const date = new Date(d[0]);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [{
                    label: 'Lượt click',
                    data: dailyData.map(d => d[1]),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }
    
    // Hourly Chart
    const hourlyCtx = document.getElementById('hourlyChart')?.getContext('2d');
    if (hourlyCtx) {
        if (hourlyChart) hourlyChart.destroy();
        
        hourlyChart = new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => i + 'h'),
                datasets: [{
                    label: 'Lượt click',
                    data: stats.clicksByHour || Array(24).fill(0),
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }
    
    // Devices Chart
    const devicesCtx = document.getElementById('devicesChart')?.getContext('2d');
    if (devicesCtx) {
        if (devicesChart) devicesChart.destroy();
        
        devicesChart = new Chart(devicesCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.devices || {}),
                datasets: [{
                    data: Object.values(stats.devices || {}),
                    backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        labels: { color: '#94a3b8' } 
                    }
                }
            }
        });
    }
    
    // Browsers Chart
    const browsersCtx = document.getElementById('browsersChart')?.getContext('2d');
    if (browsersCtx) {
        if (browsersChart) browsersChart.destroy();
        
        browsersChart = new Chart(browsersCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(stats.browsers || {}),
                datasets: [{
                    data: Object.values(stats.browsers || {}),
                    backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        labels: { color: '#94a3b8' } 
                    }
                }
            }
        });
    }
}

// Render top links
function renderTopLinks(links) {
    const tbody = document.getElementById('topLinksBody');
    
    if (!links || links.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = links.map(link => `
        <tr>
            <td><a href="${link.shortUrl}" target="_blank">${link.code}</a></td>
            <td class="url-cell">${link.longUrl.substring(0, 50)}${link.longUrl.length > 50 ? '...' : ''}</td>
            <td>${link.clicks}</td>
            <td>${new Date(link.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>
                <button onclick="viewLinkStats('${link.code}')" class="icon-btn" title="Xem thống kê">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button onclick="deleteLink('${link.code}')" class="icon-btn delete" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load links data
async function loadLinksData() {
    try {
        const response = await fetch('/api/admin/links', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            linksData = data.links;
            renderLinksTable();
        } else {
            showNotification('Không thể tải dữ liệu links', true);
        }
    } catch (error) {
        console.error('Error loading links:', error);
        showNotification('Lỗi tải dữ liệu links', true);
    }
}

// Render links table
function renderLinksTable(filteredData = null) {
    const tbody = document.getElementById('linksBody');
    const data = filteredData || linksData;
    const start = (currentPageNum - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = data.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = pageData.map(link => `
        <tr>
            <td><code>${link.code}</code></td>
            <td class="url-cell">${link.longUrl.substring(0, 50)}${link.longUrl.length > 50 ? '...' : ''}</td>
            <td><a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a></td>
            <td>${link.totalClicks || 0}</td>
            <td>${new Date(link.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>${link.lastClick ? new Date(link.lastClick).toLocaleDateString('vi-VN') : '-'}</td>
            <td>
                <button onclick="viewLinkStats('${link.code}')" class="icon-btn" title="Xem thống kê">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button onclick="deleteLink('${link.code}')" class="icon-btn delete" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `${currentPageNum} / ${totalPages || 1}`;
    
    // Update button states
    document.getElementById('prevPage').disabled = currentPageNum === 1;
    document.getElementById('nextPage').disabled = currentPageNum === totalPages || totalPages === 0;
}

// Search links
document.getElementById('searchLinks')?.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = linksData.filter(link => 
        link.code.toLowerCase().includes(search) ||
        link.longUrl.toLowerCase().includes(search)
    );
    
    currentPageNum = 1;
    renderLinksTable(filtered);
});

// Pagination
document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPageNum > 1) {
        currentPageNum--;
        renderLinksTable();
    }
});

document.getElementById('nextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(linksData.length / itemsPerPage);
    if (currentPageNum < totalPages) {
        currentPageNum++;
        renderLinksTable();
    }
});

// Delete link
window.deleteLink = async (code) => {
    if (!confirm('Bạn có chắc muốn xóa link này?')) return;
    
    try {
        const response = await fetch(`/api/admin/links/${code}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Đã xóa link thành công');
            loadLinksData();
            loadDashboardData();
        } else {
            showNotification(data.error || 'Không thể xóa link', true);
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showNotification('Lỗi xóa link', true);
    }
};

// View link stats
window.viewLinkStats = (code) => {
    // Mở modal thống kê chi tiết
    showNotification('Tính năng đang phát triển');
};

// Load users data
async function loadUsersData() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            renderUsersGrid(data.users);
        } else {
            showNotification('Không thể tải dữ liệu users', true);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Lỗi tải dữ liệu users', true);
    }
}

// Render users grid
function renderUsersGrid(users) {
    const grid = document.getElementById('usersGrid');
    
    if (!users || users.length === 0) {
        grid.innerHTML = '<p class="text-center">Chưa có tài khoản admin</p>';
        return;
    }
    
    grid.innerHTML = users.map(user => `
        <div class="user-card glass">
            <div class="user-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-info">
                <h4>${user.username}</h4>
                <p>${user.email}</p>
                <span class="user-role ${user.role}">${user.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
                <small>Đăng nhập lần cuối: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</small>
            </div>
            <div class="user-actions">
                ${user.role !== 'superadmin' ? `
                    <button onclick="deleteUser('${user.username}')" class="icon-btn delete" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Delete user
window.deleteUser = async (username) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản ${username}?`)) return;
    
    try {
        const response = await fetch(`/api/admin/users/${username}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Đã xóa tài khoản thành công');
            loadUsersData();
        } else {
            showNotification(data.error || 'Không thể xóa tài khoản', true);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Lỗi xóa tài khoản', true);
    }
};

// Add Admin Modal
addAdminBtn?.addEventListener('click', () => {
    addAdminModal.classList.add('active');
});

closeModal?.addEventListener('click', () => {
    addAdminModal.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === addAdminModal) {
        addAdminModal.classList.remove('active');
    }
});

// Add Admin Form
addAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newAdmin = {
        username: document.getElementById('newUsername').value,
        email: document.getElementById('newEmail').value,
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newRole').value
    };
    
    // Validate
    if (newAdmin.password.length < 6) {
        showNotification('Mật khẩu phải có ít nhất 6 ký tự', true);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAdmin),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Thêm admin thành công');
            addAdminModal.classList.remove('active');
            addAdminForm.reset();
            loadUsersData();
        } else {
            showNotification(data.error || 'Không thể thêm admin', true);
        }
    } catch (error) {
        console.error('Error adding admin:', error);
        showNotification('Lỗi thêm admin', true);
    }
});

// Export links
document.getElementById('exportLinks')?.addEventListener('click', () => {
    const dataStr = JSON.stringify(linksData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `links-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Xuất dữ liệu thành công');
});

// Date range change
document.getElementById('dateRange')?.addEventListener('change', () => {
    loadDashboardData();
});

// Settings forms
document.getElementById('generalSettings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('Đã lưu cài đặt chung');
});

document.getElementById('securitySettings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('Đã lưu cài đặt bảo mật');
});

// Auto refresh data every 60 seconds
setInterval(() => {
    if (currentPage === 'dashboard') {
        loadDashboardData();
    } else if (currentPage === 'links') {
        loadLinksData();
    } else if (currentPage === 'users') {
        loadUsersData();
    }
}, 60000);
// ========== PHẦN THÊM MỚI CHO LOGIN PREMIUM ==========

// DOM Elements cho Login mới
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const rememberMe = document.getElementById('rememberMe');
const loginError = document.getElementById('loginError');

// Toggle Password Visibility với animation
if (togglePassword) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle icon với animation
        const icon = this.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        
        // Animation scale
        this.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
        
        // Focus lại input
        passwordInput.focus();
    });
}

// Auto focus username khi load trang
if (usernameInput) {
    usernameInput.focus();
}

// Remember Me functionality
function setRememberMe(username) {
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('rememberedUsername', username);
        // Set thời gian nhớ 7 ngày
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        localStorage.setItem('rememberExpiry', expiryDate.toISOString());
    } else {
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberExpiry');
    }
}

function getRememberedUsername() {
    const expiry = localStorage.getItem('rememberExpiry');
    if (expiry) {
        const expiryDate = new Date(expiry);
        if (expiryDate > new Date()) {
            return localStorage.getItem('rememberedUsername');
        } else {
            // Hết hạn thì xóa
            localStorage.removeItem('rememberedUsername');
            localStorage.removeItem('rememberExpiry');
        }
    }
    return null;
}

// Load remembered username
const rememberedUsername = getRememberedUsername();
if (rememberedUsername && usernameInput) {
    usernameInput.value = rememberedUsername;
    if (rememberMe) rememberMe.checked = true;
    if (passwordInput) passwordInput.focus();
}

// Xử lý đăng nhập với loading state
if (loginForm) {
    // Remove old event listener and add new one
    loginForm.removeEventListener('submit', loginForm._oldSubmit);
    
    async function handleLoginSubmit(e) {
        e.preventDefault();
        
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';
        
        // Validate với animation
        if (!username || !password) {
            showModernLoginError('Vui lòng nhập đầy đủ thông tin');
            
            // Shake input trống
            if (!username && usernameInput) {
                usernameInput.parentElement.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    usernameInput.parentElement.style.animation = '';
                }, 500);
            }
            if (!password && passwordInput) {
                passwordInput.parentElement.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    passwordInput.parentElement.style.animation = '';
                }, 500);
            }
            return;
        }
        
        // Show loading state
        if (loginBtn) {
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
        }
        
        if (loginError) loginError.classList.add('hidden');
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password,
                    rememberMe: rememberMe ? rememberMe.checked : false 
                }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Save remember me
                setRememberMe(username);
                
                // Show success message
                showModernNotification('Đăng nhập thành công!', 'success');
                
                // Hide login container with fade out
                if (loginContainer) {
                    loginContainer.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => {
                        // Show dashboard
                        showDashboard(data.admin);
                        loginContainer.style.animation = '';
                    }, 400);
                } else {
                    showDashboard(data.admin);
                }
            } else {
                showModernLoginError(data.error || 'Sai tên đăng nhập hoặc mật khẩu');
                
                // Shake login card
                const loginCard = document.querySelector('.login-card');
                if (loginCard) {
                    loginCard.style.animation = 'shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';
                    setTimeout(() => {
                        loginCard.style.animation = '';
                    }, 600);
                }
                
                // Shake password input
                if (passwordInput) {
                    passwordInput.parentElement.style.animation = 'shake 0.5s ease';
                    setTimeout(() => {
                        passwordInput.parentElement.style.animation = '';
                    }, 500);
                }
                
                // Clear password
                if (passwordInput) passwordInput.value = '';
                passwordInput?.focus();
            }
        } catch (error) {
            console.error('Login error:', error);
            showModernLoginError('Lỗi kết nối đến server');
        } finally {
            // Hide loading state
            if (loginBtn) {
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        }
    }
    
    // Store the handler for removal reference
    loginForm._oldSubmit = handleLoginSubmit;
    loginForm.addEventListener('submit', handleLoginSubmit);
}

// Hiển thị lỗi login mới
function showModernLoginError(message) {
    if (!loginError) return;
    
    const errorSpan = loginError.querySelector('span');
    if (errorSpan) errorSpan.textContent = message;
    loginError.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (loginError) {
            loginError.classList.add('hidden');
        }
    }, 5000);
}

// Hiển thị notification mới
function showModernNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (!notification || !notificationMessage) return;
    
    notificationMessage.textContent = message;
    notification.classList.remove('hidden');
    
    // Set màu theo type
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    // Thêm icon tương ứng
    const icon = notification.querySelector('i');
    if (icon) {
        if (type === 'success') icon.className = 'fas fa-check-circle';
        else if (type === 'error') icon.className = 'fas fa-exclamation-circle';
        else icon.className = 'fas fa-info-circle';
    }
    
    // Animation slide in
    notification.style.animation = 'slideInRight 0.3s ease';
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.classList.add('hidden');
            notification.style.animation = '';
        }, 300);
    }, 3000);
}

// Xử lý Enter key
if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && loginForm) {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Xử lý ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Clear error message
        if (loginError) loginError.classList.add('hidden');
        
        // Clear loading state
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
});

// Thêm hiệu ứng cho input khi focus
document.querySelectorAll('.glass-input-modern input').forEach(input => {
    input.addEventListener('focus', () => {
        const parent = input.parentElement;
        parent.style.transform = 'scale(1.02)';
        parent.style.transition = 'all 0.3s ease';
    });
    
    input.addEventListener('blur', () => {
        const parent = input.parentElement;
        parent.style.transform = 'scale(1)';
    });
});

// Thêm hiệuệu cho remember me checkbox
if (rememberMe) {
    rememberMe.addEventListener('change', function() {
        const checkbox = this.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            checkbox.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                checkbox.style.animation = '';
            }, 500);
        }
    });
}

// Thêm animation cho demo credentials
const demoCredentials = document.querySelector('.demo-credentials');
if (demoCredentials) {
    setInterval(() => {
        demoCredentials.style.transform = 'scale(1.02)';
        setTimeout(() => {
            demoCredentials.style.transform = 'scale(1)';
        }, 200);
    }, 3000);
}

// Thêm hiệu ứng typing cho welcome text
const welcomeText = document.querySelector('.welcome-text h2');
if (welcomeText) {
    const text = welcomeText.textContent;
    welcomeText.textContent = '';
    let i = 0;
    
    function typeWriter() {
        if (i < text.length) {
            welcomeText.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    }
    
    // Chạy hiệu ứng typing khi load
    setTimeout(typeWriter, 500);
}

// Kiểm tra và hiển thị thông báo nếu có lỗi từ URL
const urlParams = new URLSearchParams(window.location.search);
const errorParam = urlParams.get('error');
if (errorParam && loginError) {
    if (errorParam === 'session-expired') {
        showModernLoginError('Phiên đăng nhập đã hết hạn');
    } else if (errorParam === 'unauthorized') {
        showModernLoginError('Vui lòng đăng nhập để tiếp tục');
    }
}

// Thêm animation cho background
const bgImg = document.querySelector('.background-gif img');
if (bgImg) {
    // Random vị trí bắt đầu cho zoom effect
    const randomX = Math.random() * 10 - 5;
    const randomY = Math.random() * 10 - 5;
    bgImg.style.transform = `scale(1.1) translate(${randomX}px, ${randomY}px)`;
}

// Thêm effect parallax nhẹ cho background
document.addEventListener('mousemove', (e) => {
    if (!bgImg) return;
    
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    const moveX = mouseX * 20;
    const moveY = mouseY * 20;
    
    bgImg.style.transform = `scale(1.15) translate(${moveX}px, ${moveY}px)`;
});

// Thêm CSS animations cho notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.9);
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// ========== KẾT THÚC PHẦN THÊM MỚI ==========
