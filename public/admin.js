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
particlesJS('particles-js', {
    particles: {
        number: { value: 80 },
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
            out_mode: 'out'
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: { enable: true, mode: 'repulse' },
            onclick: { enable: true, mode: 'push' }
        }
    }
});

// Kiểm tra đăng nhập khi load trang
checkLoginStatus();

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
        notification.style.background = 'var(--glass-bg)';
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
            loginError.textContent = data.error;
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
        }
    } catch (error) {
        showNotification('Lỗi tải dữ liệu dashboard', true);
    }
}

// Cập nhật thống kê
function updateDashboardStats(stats) {
    document.getElementById('totalLinks').textContent = stats.totalLinks;
    document.getElementById('totalClicks').textContent = stats.totalClicks.toLocaleString();
    document.getElementById('uniqueVisitors').textContent = stats.uniqueVisitors.toLocaleString();
    document.getElementById('todayClicks').textContent = stats.todayClicks.toLocaleString();
}

// Render charts
function renderCharts(stats) {
    // Daily Chart
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    if (dailyChart) dailyChart.destroy();
    
    const dailyData = Object.entries(stats.clicksByDay || {})
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-30);
    
    dailyChart = new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d[0]),
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
                x: { ticks: { color: 'white' } },
                y: { ticks: { color: 'white' } }
            }
        }
    });
    
    // Hourly Chart
    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
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
                x: { ticks: { color: 'white' } },
                y: { ticks: { color: 'white' } }
            }
        }
    });
    
    // Devices Chart
    const devicesCtx = document.getElementById('devicesChart').getContext('2d');
    if (devicesChart) devicesChart.destroy();
    
    devicesChart = new Chart(devicesCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stats.devices || {}),
            datasets: [{
                data: Object.values(stats.devices || {}),
                backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
    
    // Browsers Chart
    const browsersCtx = document.getElementById('browsersChart').getContext('2d');
    if (browsersChart) browsersChart.destroy();
    
    browsersChart = new Chart(browsersCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(stats.browsers || {}),
            datasets: [{
                data: Object.values(stats.browsers || {}),
                backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
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
            <td class="url-cell">${link.longUrl.substring(0, 50)}...</td>
            <td>${link.clicks}</td>
            <td>${new Date(link.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>
                <button onclick="viewLinkStats('${link.code}')" class="icon-btn">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button onclick="deleteLink('${link.code}')" class="icon-btn delete">
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
        }
    } catch (error) {
        showNotification('Lỗi tải dữ liệu links', true);
    }
}

// Render links table
function renderLinksTable() {
    const tbody = document.getElementById('linksBody');
    const start = (currentPageNum - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = linksData.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = pageData.map(link => `
        <tr>
            <td><code>${link.code}</code></td>
            <td class="url-cell">${link.longUrl.substring(0, 50)}...</td>
            <td><a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a></td>
            <td>${link.totalClicks || 0}</td>
            <td>${new Date(link.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>${link.lastClick ? new Date(link.lastClick).toLocaleDateString('vi-VN') : '-'}</td>
            <td>
                <button onclick="viewLinkStats('${link.code}')" class="icon-btn">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button onclick="deleteLink('${link.code}')" class="icon-btn delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update pagination
    const totalPages = Math.ceil(linksData.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `${currentPageNum} / ${totalPages}`;
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
async function deleteLink(code) {
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
            showNotification(data.error, true);
        }
    } catch (error) {
        showNotification('Lỗi xóa link', true);
    }
}

// View link stats
function viewLinkStats(code) {
    // TODO: Hiển thị modal thống kê chi tiết
    showNotification('Tính năng đang phát triển');
}

// Load users data
async function loadUsersData() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            renderUsersGrid(data.users);
        }
    } catch (error) {
        showNotification('Lỗi tải dữ liệu users', true);
    }
}

// Render users grid
function renderUsersGrid(users) {
    const grid = document.getElementById('usersGrid');
    
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
                <button onclick="deleteUser('${user.username}')" class="icon-btn delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Delete user
async function deleteUser(username) {
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
            showNotification(data.error, true);
        }
    } catch (error) {
        showNotification('Lỗi xóa tài khoản', true);
    }
}

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
            showNotification(data.error, true);
        }
    } catch (error) {
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
});

// Date range change
document.getElementById('dateRange')?.addEventListener('change', () => {
    loadDashboardData();
});
