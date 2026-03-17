const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const multer = require('multer');
const UAParser = require('ua-parser-js');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-change-in-production';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Quá nhiều request, vui lòng thử lại sau' }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { success: false, error: 'Quá nhiều request, vui lòng thử lại sau' }
});

// Middleware
app.use(cors({
    origin: BASE_URL,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/api/', limiter);

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh!'));
        }
    }
});

// Đảm bảo các thư mục tồn tại
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const urlsFile = path.join(dataDir, 'urls.json');
const statsFile = path.join(dataDir, 'stats.json');
const historyFile = path.join(dataDir, 'history.json');
const adminFile = path.join(dataDir, 'admin.json');

// Khởi tạo dữ liệu
async function initializeDataFiles() {
    try {
        // Tạo thư mục data
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir);
        }
        
        // Tạo thư mục uploads
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir);
        }
        
        // Tạo file urls.json
        try {
            await fs.access(urlsFile);
        } catch {
            await fs.writeFile(urlsFile, JSON.stringify({}));
        }
        
        // Tạo file stats.json
        try {
            await fs.access(statsFile);
        } catch {
            await fs.writeFile(statsFile, JSON.stringify({}));
        }
        
        // Tạo file history.json
        try {
            await fs.access(historyFile);
        } catch {
            await fs.writeFile(historyFile, JSON.stringify([]));
        }
        
        // Tạo file admin.json với tài khoản mặc định
        try {
            await fs.access(adminFile);
        } catch {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const defaultAdmin = {
                username: 'admin',
                password: hashedPassword,
                email: 'admin@example.com',
                role: 'superadmin',
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            await fs.writeFile(adminFile, JSON.stringify([defaultAdmin], null, 2));
            console.log('✅ Đã tạo tài khoản admin mặc định: admin / admin123');
        }
        
        console.log('✅ Đã khởi tạo dữ liệu thành công');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo dữ liệu:', error);
    }
}

// Middleware kiểm tra đăng nhập admin
const requireAdmin = async (req, res, next) => {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const admins = JSON.parse(await fs.readFile(adminFile, 'utf8'));
        const admin = admins.find(a => a.username === decoded.username);
        
        if (!admin) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// Đọc dữ liệu
async function readUrls() {
    try {
        const data = await fs.readFile(urlsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function readStats() {
    try {
        const data = await fs.readFile(statsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function readHistory() {
    try {
        const data = await fs.readFile(historyFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function readAdmins() {
    try {
        const data = await fs.readFile(adminFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Ghi dữ liệu
async function writeUrls(urls) {
    await fs.writeFile(urlsFile, JSON.stringify(urls, null, 2));
}

async function writeStats(stats) {
    await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));
}

async function writeHistory(history) {
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
}

async function writeAdmins(admins) {
    await fs.writeFile(adminFile, JSON.stringify(admins, null, 2));
}

// ==================== API PUBLIC ====================

// API: Đăng nhập admin (ĐÃ SỬA LỖI)
app.post('/api/admin/login', adminLimiter, async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        
        console.log('Login attempt:', username);
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng nhập đầy đủ thông tin' 
            });
        }
        
        const admins = await readAdmins();
        
        if (!admins || admins.length === 0) {
            console.error('No admin accounts found');
            return res.status(500).json({ 
                success: false, 
                error: 'Lỗi hệ thống' 
            });
        }
        
        const admin = admins.find(a => a.username === username);
        if (!admin) {
            console.log('User not found:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'Sai tên đăng nhập hoặc mật khẩu' 
            });
        }
        
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            console.log('Invalid password for:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'Sai tên đăng nhập hoặc mật khẩu' 
            });
        }
        
        // Cập nhật last login
        admin.lastLogin = new Date().toISOString();
        await writeAdmins(admins);
        
        // Tạo token
        const token = jwt.sign(
            { username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: rememberMe ? '7d' : '24h' }
        );
        
        // Set cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
        
        console.log('Login successful:', username);
        
        res.json({
            success: true,
            token,
            admin: {
                username: admin.username,
                role: admin.role,
                email: admin.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server, vui lòng thử lại sau' 
        });
    }
});

// API: Đăng xuất
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ success: true });
});

// API: Kiểm tra trạng thái đăng nhập
app.get('/api/admin/check', async (req, res) => {
    const token = req.cookies.adminToken;
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const admins = await readAdmins();
        const admin = admins.find(a => a.username === decoded.username);
        
        if (!admin) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }
        
        res.json({
            success: true,
            admin: {
                username: admin.username,
                role: admin.role,
                email: admin.email
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// ==================== API ADMIN ====================

// API: Lấy thống kê tổng quan
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const urls = await readUrls();
        const stats = await readStats();
        const history = await readHistory();
        
        // Tính toán các chỉ số
        let totalClicks = 0;
        let totalDevices = {};
        let totalBrowsers = {};
        let clicksByDay = {};
        let clicksByHour = Array(24).fill(0);
        
        Object.values(stats).forEach(linkStats => {
            totalClicks += linkStats.clicks?.length || 0;
            
            Object.entries(linkStats.devices || {}).forEach(([device, count]) => {
                totalDevices[device] = (totalDevices[device] || 0) + count;
            });
            
            Object.entries(linkStats.browsers || {}).forEach(([browser, count]) => {
                totalBrowsers[browser] = (totalBrowsers[browser] || 0) + count;
            });
            
            Object.entries(linkStats.daily || {}).forEach(([day, count]) => {
                clicksByDay[day] = (clicksByDay[day] || 0) + count;
            });
            
            linkStats.clicks?.forEach(click => {
                const hour = new Date(click.timestamp).getHours();
                clicksByHour[hour]++;
            });
        });
        
        const topLinks = Object.entries(urls)
            .map(([code, data]) => ({
                code,
                longUrl: data.longUrl,
                shortUrl: `${BASE_URL}/${code}`,
                clicks: data.totalClicks || 0,
                createdAt: data.createdAt,
                previewImage: data.previewImage
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);
        
        res.json({
            success: true,
            stats: {
                totalLinks: Object.keys(urls).length,
                totalClicks,
                uniqueVisitors: totalClicks,
                todayClicks: clicksByDay[new Date().toISOString().split('T')[0]] || 0,
                devices: totalDevices,
                browsers: totalBrowsers,
                clicksByDay,
                clicksByHour,
                topLinks
            }
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// API: Lấy danh sách tất cả links
app.get('/api/admin/links', requireAdmin, async (req, res) => {
    try {
        const urls = await readUrls();
        const stats = await readStats();
        
        const links = Object.entries(urls).map(([code, data]) => ({
            code,
            ...data,
            shortUrl: `${BASE_URL}/${code}`,
            stats: stats[code] || { clicks: [] }
        }));
        
        res.json({ success: true, links });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// API: Xóa link
app.delete('/api/admin/links/:code', requireAdmin, async (req, res) => {
    try {
        const { code } = req.params;
        const urls = await readUrls();
        const stats = await readStats();
        let history = await readHistory();
        
        if (!urls[code]) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy link' });
        }
        
        delete urls[code];
        delete stats[code];
        history = history.filter(item => item.shortCode !== code);
        
        await writeUrls(urls);
        await writeStats(stats);
        await writeHistory(history);
        
        res.json({ success: true, message: 'Đã xóa link thành công' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// API: Quản lý admin users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const admins = await readAdmins();
        const users = admins.map(({ password, ...user }) => user);
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        const admins = await readAdmins();
        
        if (admins.find(a => a.username === username)) {
            return res.status(400).json({ success: false, error: 'Username đã tồn tại' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = {
            username,
            password: hashedPassword,
            email,
            role: role || 'admin',
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        admins.push(newAdmin);
        await writeAdmins(admins);
        
        const { password: _, ...adminData } = newAdmin;
        res.json({ success: true, user: adminData });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

app.delete('/api/admin/users/:username', requireAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const admins = await readAdmins();
        
        if (admins.length <= 1) {
            return res.status(400).json({ success: false, error: 'Không thể xóa tài khoản cuối cùng' });
        }
        
        if (username === req.admin.username) {
            return res.status(400).json({ success: false, error: 'Không thể xóa tài khoản của chính mình' });
        }
        
        const newAdmins = admins.filter(a => a.username !== username);
        await writeAdmins(newAdmins);
        
        res.json({ success: true, message: 'Đã xóa tài khoản' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// ==================== API PUBLIC ====================

// API: Tạo link rút gọn
app.post('/api/shorten', upload.single('previewImage'), async (req, res) => {
    try {
        const { longUrl, customCode } = req.body;
        const previewImage = req.file;
        
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL không hợp lệ' 
            });
        }
        
        const urls = await readUrls();
        const stats = await readStats();
        const history = await readHistory();
        
        let shortCode = null;
        for (const [code, data] of Object.entries(urls)) {
            if (data.longUrl === longUrl) {
                shortCode = code;
                break;
            }
        }
        
        if (!shortCode) {
            if (customCode) {
                if (urls[customCode]) {
                    return res.status(400).json({
                        success: false,
                        error: 'Mã rút gọn đã tồn tại!'
                    });
                }
                shortCode = customCode;
            } else {
                shortCode = nanoid(6);
                while (urls[shortCode]) {
                    shortCode = nanoid(6);
                }
            }
            
            urls[shortCode] = {
                longUrl,
                createdAt: new Date().toISOString(),
                previewImage: previewImage ? `/uploads/${previewImage.filename}` : null,
                totalClicks: 0,
                createdBy: req.ip
            };
            
            stats[shortCode] = {
                clicks: [],
                devices: {},
                browsers: {},
                referrers: {},
                daily: {},
                hourly: Array(24).fill(0)
            };
            
            await writeUrls(urls);
            await writeStats(stats);
        }
        
        history.unshift({
            shortCode,
            longUrl,
            createdAt: new Date().toISOString(),
            previewImage: previewImage ? `/uploads/${previewImage.filename}` : null,
            ip: req.ip
        });
        
        if (history.length > 100) {
            history.pop();
        }
        
        await writeHistory(history);
        
        const shortUrl = `${BASE_URL}/${shortCode}`;
        res.json({ 
            success: true, 
            shortUrl,
            longUrl,
            shortCode,
            previewImage: urls[shortCode].previewImage
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Đã xảy ra lỗi server' 
        });
    }
});

// API: Lấy thống kê chi tiết của link
app.get('/api/stats/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const urls = await readUrls();
        const stats = await readStats();
        
        if (urls[code]) {
            res.json({
                success: true,
                urlInfo: urls[code],
                stats: stats[code] || { 
                    clicks: [], 
                    devices: {}, 
                    browsers: {}, 
                    referrers: {}, 
                    daily: {},
                    hourly: Array(24).fill(0)
                }
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Không tìm thấy link' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Đã xảy ra lỗi server' 
        });
    }
});

// API: Lấy lịch sử
app.get('/api/history', async (req, res) => {
    try {
        const history = await readHistory();
        res.json({
            success: true,
            history: history.slice(0, 50)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Đã xảy ra lỗi server'
        });
    }
});

// API: Xóa lịch sử
app.delete('/api/history/:code', async (req, res) => {
    try {
        const { code } = req.params;
        let history = await readHistory();
        history = history.filter(item => item.shortCode !== code);
        await writeHistory(history);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// Redirect và ghi nhận thống kê
app.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const urls = await readUrls();
        const stats = await readStats();
        
        if (urls[code]) {
            const parser = new UAParser(req.headers['user-agent']);
            const device = parser.getDevice().type || 'desktop';
            const browser = parser.getBrowser().name || 'Unknown';
            const os = parser.getOS().name || 'Unknown';
            const referrer = req.get('Referrer') || 'direct';
            const ip = req.ip;
            
            if (!stats[code]) {
                stats[code] = {
                    clicks: [],
                    devices: {},
                    browsers: {},
                    os: {},
                    referrers: {},
                    daily: {},
                    hourly: Array(24).fill(0)
                };
            }
            
            const click = {
                timestamp: new Date().toISOString(),
                device,
                browser,
                os,
                referrer,
                ip
            };
            
            stats[code].clicks.push(click);
            stats[code].devices[device] = (stats[code].devices[device] || 0) + 1;
            stats[code].browsers[browser] = (stats[code].browsers[browser] || 0) + 1;
            stats[code].os[os] = (stats[code].os[os] || 0) + 1;
            stats[code].referrers[referrer] = (stats[code].referrers[referrer] || 0) + 1;
            
            const today = new Date().toISOString().split('T')[0];
            stats[code].daily[today] = (stats[code].daily[today] || 0) + 1;
            
            const hour = new Date().getHours();
            stats[code].hourly[hour] = (stats[code].hourly[hour] || 0) + 1;
            
            urls[code].totalClicks = (urls[code].totalClicks || 0) + 1;
            urls[code].lastClick = new Date().toISOString();
            
            await writeUrls(urls);
            await writeStats(stats);
            
            res.redirect(301, urls[code].longUrl);
        } else {
            res.redirect('/?error=not-found');
        }
    } catch (error) {
        console.error('Redirect error:', error);
        res.redirect('/?error=server-error');
    }
});

// Khởi tạo và chạy server
initializeDataFiles().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server đang chạy tại: ${BASE_URL}`);
        console.log(`🔐 Admin login: ${BASE_URL}/admin.html`);
        console.log(`📝 API endpoint: ${BASE_URL}/api/shorten`);
        console.log(`📊 Stats endpoint: ${BASE_URL}/api/stats/[code]`);
        console.log(`👤 Default admin: admin / admin123`);
    });
});
