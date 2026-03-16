// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const longUrlInput = document.getElementById('longUrl');
const customCodeInput = document.getElementById('customCode');
const previewImageInput = document.getElementById('previewImage');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.querySelector('.remove-image');
const shortenBtn = document.getElementById('shortenBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const result = document.getElementById('result');
const originalUrl = document.getElementById('originalUrl');
const shortUrl = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const newLinkBtn = document.getElementById('newLinkBtn');
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeModal = document.querySelector('.close-modal');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');

// Chart instances
let overviewChart, devicesChart, dailyChart;

// API endpoint
const API_URL = window.location.origin;

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

// Xem trước ảnh
previewImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Kiểm tra kích thước file (tối đa 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Ảnh không được vượt quá 5MB', true);
            previewImageInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = imagePreview.querySelector('img');
            img.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Xóa ảnh preview
removeImageBtn?.addEventListener('click', () => {
    previewImageInput.value = '';
    imagePreview.classList.add('hidden');
});

// Kiểm tra URL hợp lệ
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Tạo hiệu ứng ripple
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'btn-ripple';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Xử lý form submit
shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const longUrl = longUrlInput.value.trim();
    const customCode = customCodeInput.value.trim();
    const previewImage = previewImageInput.files[0];
    
    // Kiểm tra URL
    if (!isValidUrl(longUrl)) {
        showNotification('URL không hợp lệ! Vui lòng nhập URL đầy đủ (http:// hoặc https://)', true);
        return;
    }
    
    // Kiểm tra custom code (nếu có)
    if (customCode && !/^[a-zA-Z0-9_-]+$/.test(customCode)) {
        showNotification('Mã rút gọn chỉ được chứa chữ cái, số, gạch dưới và gạch ngang', true);
        return;
    }
    
    // Tạo FormData
    const formData = new FormData();
    formData.append('longUrl', longUrl);
    if (customCode) formData.append('customCode', customCode);
    if (previewImage) formData.append('previewImage', previewImage);
    
    // Hiệu ứng ripple
    createRipple(e);
    
    // Ẩn kết quả, hiển thị loading
    result.classList.add('hidden');
    error.classList.add('hidden');
    loading.classList.remove('hidden');
    shortenBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/shorten`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Hiển thị kết quả
            originalUrl.textContent = data.longUrl;
            shortUrl.textContent = data.shortUrl;
            shortUrl.href = data.shortUrl;
            
            if (data.previewImage) {
                const preview = document.getElementById('resultPreview');
                const img = preview.querySelector('img');
                img.src = data.previewImage;
                preview.classList.remove('hidden');
            } else {
                document.getElementById('resultPreview').classList.add('hidden');
            }
            
            result.classList.remove('hidden');
            longUrlInput.value = '';
            customCodeInput.value = '';
            previewImageInput.value = '';
            imagePreview.classList.add('hidden');
            
            showNotification('Đã tạo link rút gọn thành công!');
            
            // Cập nhật thống kê và lịch sử
            updateStats();
            loadHistory();
        } else {
            showNotification(data.error || 'Có lỗi xảy ra!', true);
        }
    } catch (err) {
        console.error('Error:', err);
        showNotification('Không thể kết nối đến server!', true);
    } finally {
        loading.classList.add('hidden');
        shortenBtn.disabled = false;
    }
});

// Copy link
copyBtn.addEventListener('click', async () => {
    const url = shortUrl.textContent;
    
    try {
        await navigator.clipboard.writeText(url);
        showNotification('Đã copy link vào clipboard!');
        
        // Hiệu ứng
        copyBtn.style.transform = 'scale(1.2)';
        copyBtn.style.color = 'var(--secondary-color)';
        setTimeout(() => {
            copyBtn.style.transform = '';
            copyBtn.style.color = '';
        }, 500);
    } catch (err) {
        showNotification('Không thể copy link! Vui lòng thử lại', true);
    }
});

// Tạo link mới
newLinkBtn.addEventListener('click', () => {
    result.classList.add('hidden');
    longUrlInput.focus();
});

// Xem thống kê
statsBtn.addEventListener('click', async () => {
    const code = shortUrl.textContent.split('/').pop();
    await loadStats(code);
    statsModal.classList.add('active');
});

// Đóng modal
closeModal.addEventListener('click', () => {
    statsModal.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === statsModal) {
        statsModal.classList.remove('active');
    }
});

// Load thống kê chi tiết
async function loadStats(code) {
    try {
        const response = await fetch(`${API_URL}/api/stats/${code}`);
        const data = await response.json();
        
        if (data.success) {
            renderCharts(data.stats);
            renderClickDetails(data.stats.clicks);
        } else {
            showNotification('Không thể tải thống kê', true);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification('Lỗi tải thống kê', true);
    }
}

// Render charts
function renderCharts(stats) {
    // Tổng quan - Daily clicks
    const overviewCtx = document.getElementById('overviewChart')?.getContext('2d');
    if (overviewCtx) {
        if (overviewChart) overviewChart.destroy();
        
        const dailyData = Object.entries(stats.daily || {}).sort((a, b) => 
            new Date(a[0]) - new Date(b[0])
        );
        
        overviewChart = new Chart(overviewCtx, {
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
                    legend: { 
                        labels: { color: 'white' } 
                    }
                },
                scales: {
                    x: { 
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: { 
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }
    
    // Thiết bị
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
                        labels: { color: 'white' } 
                    }
                }
            }
        });
    }
    
    // Daily chart
    const dailyCtx = document.getElementById('dailyChart')?.getContext('2d');
    if (dailyCtx) {
        if (dailyChart) dailyChart.destroy();
        
        const last7Days = Object.entries(stats.daily || {})
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .slice(-7);
        
        dailyChart = new Chart(dailyCtx, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d[0]),
                datasets: [{
                    label: 'Lượt click',
                    data: last7Days.map(d => d[1]),
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        labels: { color: 'white' } 
                    }
                },
                scales: {
                    x: { 
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: { 
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }
}

// Render click details
function renderClickDetails(clicks) {
    const container = document.getElementById('clickDetails');
    
    if (!clicks || clicks.length === 0) {
        container.innerHTML = '<p class="no-data">Chưa có lượt click nào</p>';
        return;
    }
    
    container.innerHTML = clicks.slice(-10).reverse().map(click => `
        <div class="click-item">
            <span class="time">${new Date(click.timestamp).toLocaleString('vi-VN')}</span>
            <span class="device">${click.device} - ${click.browser}</span>
            <span class="referrer">${click.referrer}</span>
        </div>
    `).join('');
}

// Load lịch sử
async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/api/history`);
        const data = await response.json();
        
        if (data.success) {
            renderHistory(data.history);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Render lịch sử
function renderHistory(history) {
    if (!history || history.length === 0) {
        historyList.innerHTML = '<p class="no-data">Chưa có lịch sử</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item" data-code="${item.shortCode}">
            ${item.previewImage ? 
                `<img src="${item.previewImage}" alt="Preview">` : 
                `<div class="no-image"><i class="fas fa-link"></i></div>`
            }
            <div class="history-info">
                <a href="${API_URL}/${item.shortCode}" target="_blank">
                    ${API_URL}/${item.shortCode}
                </a>
                <small class="history-time">
                    ${new Date(item.createdAt).toLocaleString('vi-VN')}
                </small>
            </div>
            <div class="history-actions">
                <button onclick="copyHistoryLink('${API_URL}/${item.shortCode}')" title="Copy link">
                    <i class="fas fa-copy"></i>
                </button>
                <button onclick="viewStats('${item.shortCode}')" title="Xem thống kê">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button onclick="deleteHistory('${item.shortCode}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Copy link từ lịch sử
window.copyHistoryLink = async (url) => {
    try {
        await navigator.clipboard.writeText(url);
        showNotification('Đã copy link vào clipboard!');
    } catch (err) {
        showNotification('Không thể copy link!', true);
    }
};

// Xem thống kê từ lịch sử
window.viewStats = async (code) => {
    await loadStats(code);
    statsModal.classList.add('active');
};

// Xóa lịch sử
window.deleteHistory = async (code) => {
    if (!confirm('Bạn có chắc muốn xóa khỏi lịch sử?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/history/${code}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Đã xóa khỏi lịch sử');
            loadHistory();
        }
    } catch (error) {
        showNotification('Có lỗi xảy ra!', true);
    }
};

// Xóa tất cả lịch sử
clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Bạn có chắc muốn xóa tất cả lịch sử?')) return;
    
    try {
        // Xóa từng item
        const historyItems = document.querySelectorAll('.history-item');
        for (const item of historyItems) {
            const code = item.dataset.code;
            await fetch(`${API_URL}/api/history/${code}`, {
                method: 'DELETE'
            });
        }
        
        showNotification('Đã xóa tất cả lịch sử');
        loadHistory();
    } catch (error) {
        showNotification('Có lỗi xảy ra!', true);
    }
});

// Cập nhật thống kê tổng quan
async function updateStats() {
    try {
        // Lấy dữ liệu từ history và stats để tính toán
        const historyResponse = await fetch(`${API_URL}/api/history`);
        const historyData = await historyResponse.json();
        
        const totalLinks = historyData.success ? historyData.history.length : 0;
        
        // Tính tổng clicks (cần gọi từng link hoặc có API riêng)
        // Tạm thời để số liệu mẫu
        document.getElementById('totalLinks').textContent = totalLinks;
        document.getElementById('totalClicks').textContent = '1,234';
        document.getElementById('uniqueUsers').textContent = '456';
        document.getElementById('todayClicks').textContent = '89';
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabMap = {
            'overview': 'tabOverview',
            'devices': 'tabDevices',
            'daily': 'tabDaily'
        };
        
        document.getElementById(tabMap[tabId]).classList.add('active');
    });
});

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    longUrlInput.focus();
    loadHistory();
    updateStats();
    
    // Kiểm tra lỗi từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'not-found') {
        showNotification('Link không tồn tại!', true);
    } else if (errorParam === 'server-error') {
        showNotification('Lỗi server! Vui lòng thử lại sau', true);
    }
});

// Auto format URL khi paste
longUrlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const url = longUrlInput.value;
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            longUrlInput.value = 'https://' + url;
        }
    }, 100);
});

// Validate URL khi nhập
longUrlInput.addEventListener('blur', () => {
    const url = longUrlInput.value;
    if (url && !isValidUrl(url)) {
        showNotification('URL không hợp lệ!', true);
    }
});

// Hiệu ứng hover cho card
document.querySelectorAll('.stat-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Xử lý responsive
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        // Mobile adjustments
        document.querySelectorAll('.history-item').forEach(item => {
            item.style.flexDirection = 'column';
        });
    } else {
        document.querySelectorAll('.history-item').forEach(item => {
            item.style.flexDirection = 'row';
        });
    }
});
