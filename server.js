// =============================================
// MEHRO EARN HUB - COMPLETE BACKEND
// FILE: server.js
// =============================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'mehro_secret_key_2024';
const BCRYPT_ROUNDS = 10;

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// =============================================
// DATABASE CONNECTION
// =============================================
let db;

async function connectDB() {
    try {
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mehro_earn_hub'
        });
        console.log('✅ Database connected');
        await createTables();
        return db;
    } catch (error) {
        console.log('⚠️ Database not connected. Using local storage mode.');
        console.log('💡 To use database: Install MySQL and create database');
        return null;
    }
}

async function createTables() {
    if (!db) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            wallet_balance DECIMAL(15,2) DEFAULT 0,
            referral_code VARCHAR(20) UNIQUE,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            plan_name VARCHAR(100) NOT NULL,
            price DECIMAL(15,2) NOT NULL,
            daily_income DECIMAL(10,2) DEFAULT 0,
            duration INT DEFAULT 30,
            total_profit DECIMAL(15,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS deposits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            plan_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS withdraws (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS referrals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            referrer_id INT NOT NULL,
            referred_id INT NOT NULL,
            bonus_amount DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ Tables created');
}

// =============================================
// HELPERS
// =============================================
function generateToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch { return null; }
}

function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// =============================================
// MIDDLEWARE - AUTH
// =============================================
async function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
}

// =============================================
// API ROUTES
// =============================================

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, referral_code } = req.body;
        
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        if (db) {
            const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }
            
            const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const refCode = generateReferralCode();
            
            let referredBy = null;
            if (referral_code) {
                const [ref] = await db.query('SELECT id FROM users WHERE referral_code = ?', [referral_code]);
                if (ref.length > 0) referredBy = ref[0].id;
            }
            
            await db.query(
                'INSERT INTO users (full_name, email, password, phone, referral_code) VALUES (?, ?, ?, ?, ?)',
                [full_name, email, hashed, phone, refCode]
            );
            
            if (referredBy) {
                const [newUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                await db.query(
                    'INSERT INTO referrals (referrer_id, referred_id, bonus_amount) VALUES (?, ?, ?)',
                    [referredBy, newUser[0].id, 50]
                );
                await db.query('UPDATE users SET wallet_balance = wallet_balance + 50 WHERE id = ?', [referredBy]);
            }
            
            const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            const token = generateToken(user[0].id, email);
            res.json({ 
                success: true, 
                data: { 
                    token, 
                    user: { 
                        id: user[0].id, 
                        full_name: user[0].full_name, 
                        email: user[0].email,
                        wallet_balance: user[0].wallet_balance
                    } 
   } 
            });
        } else {
            // Demo mode
            const token = generateToken(1, email);
            res.json({ 
                success: true, 
                data: { 
                    token, 
                    user: { 
                        id: 1, 
                        full_name: full_name, 
                        email: email,
                        wallet_balance: 5000
                    } 
                } 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        if (db) {
            const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const valid = await bcrypt.compare(password, users[0].password);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const token = generateToken(users[0].id, email);
            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: users[0].id,
                        full_name: users[0].full_name,
                        email: users[0].email,
                        wallet_balance: users[0].wallet_balance
                    }
                }
            });
        } else {
            // Demo mode - any login works
            const token = generateToken(1, email);
            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: 1,
                        full_name: 'Demo User',
                        email: email,
                        wallet_balance: 5000
                    }
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== USER =====
app.get('/api/user/profile', authenticate, async (req, res) => {
    try {
        if (db) {
            const [users] = await db.query('SELECT id, full_name, email, phone, wallet_balance FROM users WHERE id = ?', [req.userId]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.json({ success: true, data: { user: users[0] } });
        } else {
            res.json({ success: true, data: { user: { id: 1, full_name: 'Demo User', email: 'demo@demo.com', wallet_balance: 5000 } } });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/user/profile', authenticate, async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        if (db) {
            await db.query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [full_name, phone, req.userId]);
            res.json({ success: true, message: 'Profile updated' });
        } else {
            res.json({ success: true, message: 'Profile updated (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/user/dashboard', authenticate, async (req, res) => {
    try {
        if (db) {
            const [users] = await db.query('SELECT full_name, wallet_balance FROM users WHERE id = ?', [req.userId]);
            const [deposits] = await db.query('SELECT SUM(amount) as total FROM deposits WHERE user_id = ? AND status = "approved"', [req.userId]);
            const [withdraws] = await db.query('SELECT SUM(amount) as total FROM withdraws WHERE user_id = ? AND status = "paid"', [req.userId]);
            const [referrals] = await db.query('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?', [req.userId]);
            const [pending] = await db.query('SELECT COUNT(*) as count FROM withdraws WHERE user_id = ? AND status = "pending"', [req.userId]);
 
res.json({
                success: true,
                data: {
                    stats: {
                        full_name: users[0]?.full_name || 'User',
                        wallet_balance: users[0]?.wallet_balance || 0,
                        total_deposits: deposits[0]?.total || 0,
                        total_withdraws: withdraws[0]?.total || 0,
                        total_referrals: referrals[0]?.count || 0,
                        pending_withdraw: pending[0]?.count || 0
                    }
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    stats: {
                        full_name: 'Demo User',
                        wallet_balance: 5000,
                        total_deposits: 10000,
                        total_withdraws: 2000,
                        total_referrals: 5,
                        pending_withdraw: 1
                    }
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== PLANS =====
app.get('/api/plans', async (req, res) => {
    try {
        if (db) {
            const [plans] = await db.query('SELECT * FROM plans WHERE status = "active" ORDER BY display_order ASC');
            res.json({ success: true, data: { plans } });
        } else {
            res.json({
                success: true,
                data: {
                    plans: [
                        { id: 1, plan_name: 'Starter', price: 500, daily_income: 5, duration: 30, total_profit: 650, min_withdraw: 10, max_withdraw: 100, status: 'active' },
                        { id: 2, plan_name: 'Silver', price: 1000, daily_income: 12, duration: 45, total_profit: 1540, min_withdraw: 20, max_withdraw: 200, status: 'active' },
                        { id: 3, plan_name: 'Gold', price: 2500, daily_income: 35, duration: 60, total_profit: 4600, min_withdraw: 50, max_withdraw: 500, status: 'active' }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            const [plans] = await db.query('SELECT * FROM plans WHERE id = ?', [id]);
            if (plans.length === 0) {
                return res.status(404).json({ success: false, message: 'Plan not found' });
            }
            res.json({ success: true, data: { plan: plans[0] } });
        } else {
            const plans = [
                { id: 1, plan_name: 'Starter', price: 500, daily_income: 5, duration: 30, total_profit: 650 },
                { id: 2, plan_name: 'Silver', price: 1000, daily_income: 12, duration: 45, total_profit: 1540 },
                { id: 3, plan_name: 'Gold', price: 2500, daily_income: 35, duration: 60, total_profit: 4600 }
            ];
            const plan = plans.find(p => p.id == id);
            if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
            res.json({ success: true, data: { plan } });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/plans/activate', authenticate, async (req, res) => {
    try {
        const { plan_id, payment_method, account_name, account_number, transaction_id, screenshot } = req.body;
        
        if (!plan_id) {
            return res.status(400).json({ success: false, message: 'Plan ID required' });
        }

        if (db) {
            const [plan] = await db.query('SELECT * FROM plans WHERE id = ?', [plan_id]);
            if (plan.length === 0) {
                return res.status(404).json({ success: false, message: 'Plan not found' });
            }
            
            await db.query(
                'INSERT INTO deposits (user_id, plan_id, amount, status) VALUES (?, ?, ?, "pending")',
                [req.userId, plan_id, plan[0].price]
            );
            
            res.json({ success: true, message: 'Activation request submitted successfully' });
        } else {
            res.json({ success: true, message: 'Activation request submitted successfully' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== WALLET =====
app.get('/api/wallet/summary', authenticate, async (req, res) => {
    try {
        if (db) {
            const [users] = await db.query('SELECT wallet_balance FROM users WHERE id = ?', [req.userId]);
            const [deposits] = await db.query('SELECT SUM(amount) as total FROM deposits WHERE user_id = ? AND status = "approved"', [req.userId]);
            const [withdraws] = await db.query('SELECT SUM(amount) as total FROM withdraws WHERE user_id = ? AND status = "paid"', [req.userId]);
            const [referrals] = await db.query('SELECT SUM(bonus_amount) as total FROM referrals WHERE referrer_id = ?', [req.userId]);
            
            res.json({
                success: true,
                data: {
                    balance: { wallet_balance: users[0]?.wallet_balance || 0 },
                    summary: {
                        total_deposits: deposits[0]?.total || 0,
                        total_withdraws: withdraws[0]?.total || 0,
                        referral_bonus: referrals[0]?.total || 0
                    }
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    balance: { wallet_balance: 5000 },
                    summary: {
                        total_deposits: 10000,
                        total_withdraws: 2000,
                        referral_bonus: 500
                    }
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/wallet/transactions', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        if (db) {
            const offset = (page - 1) * limit;
            const [rows] = await db.query(
                'SELECT * FROM deposits WHERE user_id = ? UNION SELECT * FROM withdraws WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [req.userId, req.userId, parseInt(limit), parseInt(offset)]
            );
            res.json({ success: true, data: { data: rows, total: rows.length } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, type: 'deposit', amount: 1000, status: 'approved', created_at: new Date() },
                        { id: 2, type: 'withdraw', amount: 500, status: 'paid', created_at: new Date() }
                    ],
                    total: 2
      }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== WITHDRAW =====
app.post('/api/wallet/withdraw', authenticate, async (req, res) => {
    try {
        const { amount, payment_method, account_name, account_number } = req.body;
        
        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdraw is 100 PKR' });
        }
        
        if (db) {
            const [users] = await db.query('SELECT wallet_balance FROM users WHERE id = ?', [req.userId]);
            if (users[0].wallet_balance < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient balance' });
            }
            
            await db.query(
                'INSERT INTO withdraws (user_id, amount, payment_method, status) VALUES (?, ?, ?, "pending")',
                [req.userId, amount, payment_method]
            );
            
            res.json({ success: true, message: 'Withdrawal request submitted' });
        } else {
            res.json({ success: true, message: 'Withdrawal request submitted (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/wallet/withdraws', authenticate, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.query('SELECT * FROM withdraws WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
            res.json({ success: true, data: { data: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, amount: 500, payment_method: 'EasyPaisa', status: 'paid', created_at: new Date() }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== REFERRAL =====
app.get('/api/referral/stats', authenticate, async (req, res) => {
    try {
        if (db) {
            const [referrals] = await db.query('SELECT COUNT(*) as total FROM referrals WHERE referrer_id = ?', [req.userId]);
            const [active] = await db.query('SELECT COUNT(*) as total FROM referrals WHERE referrer_id = ? AND status = "active"', [req.userId]);
            const [bonus] = await db.query('SELECT SUM(bonus_amount) as total FROM referrals WHERE referrer_id = ?', [req.userId]);
            
            res.json({
                success: true,
                data: {
                    stats: {
                        total_referrals: referrals[0]?.total || 0,
                        active_referrals: active[0]?.total || 0,
                        total_bonus: bonus[0]?.total || 0
                    },
                    settings: {
                        bonus_amount: 50,
                        bonus_enabled: true
                    }
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    stats: {
                        total_referrals: 5,
                        active_referrals: 3,
                        total_bonus: 250
                    },
                    settings: {
                        bonus_amount: 50,
                        bonus_enabled: true
                    }
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/referral/list', authenticate, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.query(
                'SELECT r.*, u.full_name, u.user_id FROM referrals r JOIN users u ON u.id = r.referred_id WHERE r.referrer_id = ?',
                [req.userId]
            );
            res.json({ success: true, data: { referrals: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    referrals: [
                        { full_name: 'Ali', user_id: 'MEHRO001', status: 'active', created_at: new Date() }
                    ]
                }
            });
        }
  } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/referral/link', authenticate, async (req, res) => {
    try {
        if (db) {
            const [users] = await db.query('SELECT referral_code FROM users WHERE id = ?', [req.userId]);
            const link = `https://mehro-earn-hub.vercel.app/02-register.html?ref=${users[0]?.referral_code || ''}`;
            res.json({ success: true, data: { referral_link: link } });
        } else {
            res.json({ success: true, data: { referral_link: 'https://mehro-earn-hub.vercel.app/02-register.html?ref=DEMO123' } });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== SUPPORT =====
app.get('/api/support', authenticate, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.query('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
            res.json({ success: true, data: { data: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, ticket_id: 'TKT001', subject: 'Test Ticket', status: 'open', created_at: new Date() }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/support', authenticate, async (req, res) => {
    try {
        const { category, subject, message } = req.body;
        if (db) {
            const ticket_id = 'TKT' + Date.now().toString(36).toUpperCase();
            await db.query(
                'INSERT INTO support_tickets (user_id, ticket_id, category, subject, message) VALUES (?, ?, ?, ?, ?)',
                [req.userId, ticket_id, category, subject, message]
            );
            res.json({ success: true, message: 'Ticket created' });
        } else {
            res.json({ success: true, message: 'Ticket created (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/support/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            const [rows] = await db.query('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?', [id, req.userId]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Ticket not found' });
            }
            res.json({ success: true, data: { ticket: rows[0], replies: [] } });
        } else {
            res.json({
                success: true,
                data: {
                    ticket: { id: 1, ticket_id: 'TKT001', subject: 'Test Ticket', status: 'open', message: 'Test message' },
                    replies: []
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/support/:id/reply', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (db) {
            await db.query(
                'INSERT INTO support_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
                [id, req.userId, message]
            );
            res.json({ success: true, message: 'Reply sent' });
        } else {
            res.json({ success: true, message: 'Reply sent (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/support/:id/close', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            await db.query('UPDATE support_tickets SET status = "closed" WHERE id = ? AND user_id = ?', [id, req.userId]);
            res.json({ success: true, message: 'Ticket closed' });
        } else {
            res.json({ success: true, message: 'Ticket closed (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== ADMIN =====
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
    try {
        if (db) {
            const [users] = await db.query('SELECT COUNT(*) as total FROM users');
            const [active] = await db.query('SELECT COUNT(*) as total FROM users WHERE status = "active"');
            const [deposits] = await db.query('SELECT SUM(amount) as total FROM deposits WHERE status = "approved"');
            const [pending_deposits] = await db.query('SELECT COUNT(*) as total FROM deposits WHERE status = "pending"');
            const [withdraws] = await db.query('SELECT SUM(amount) as total FROM withdraws WHERE status = "paid"');
            const [pending_withdraws] = await db.query('SELECT COUNT(*) as total FROM withdraws WHERE status = "pending"');
            const [tickets] = await db.query('SELECT COUNT(*) as total FROM support_tickets WHERE status != "closed"');

res.json({
                success: true,
                data: {
                    users: { total_users: users[0]?.total || 0, active_users: active[0]?.total || 0 },
                    deposits: { total_deposit_amount: deposits[0]?.total || 0, pending: pending_deposits[0]?.total || 0 },
                    withdraws: { total_withdraw_amount: withdraws[0]?.total || 0, pending: pending_withdraws[0]?.total || 0 },
                    tickets: { open: tickets[0]?.total || 0 }
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    users: { total_users: 25, active_users: 20 },
                    deposits: { total_deposit_amount: 50000, pending: 3 },
                    withdraws: { total_withdraw_amount: 20000, pending: 2 },
                    tickets: { open: 5 }
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/admin/users', authenticate, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        if (db) {
            const offset = (page - 1) * limit;
            const [rows] = await db.query('SELECT id, full_name, email, status, wallet_balance FROM users LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
            const [count] = await db.query('SELECT COUNT(*) as total FROM users');
            res.json({ success: true, data: { data: rows, total: count[0]?.total || 0 } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, full_name: 'Demo User', email: 'demo@demo.com', status: 'active', wallet_balance: 5000 }
                    ],
                    total: 1
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/api/admin/users/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (db) {
            await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
            res.json({ success: true, message: 'Status updated' });
        } else {
            res.json({ success: true, message: 'Status updated (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/plans/admin/all', authenticate, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.query('SELECT * FROM plans ORDER BY id DESC');
            res.json({ success: true, data: { plans: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    plans: [
                        { id: 1, plan_name: 'Starter', price: 500, daily_income: 5, duration: 30, total_profit: 650, status: 'active' },
                        { id: 2, plan_name: 'Silver', price: 1000, daily_income: 12, duration: 45, total_profit: 1540, status: 'active' }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/plans/admin', authenticate, async (req, res) => {
    try {
        const { plan_name, price, daily_income, duration, total_profit, status } = req.body;
        if (db) {
            await db.query(
                'INSERT INTO plans (plan_name, price, daily_income, duration, total_profit, status) VALUES (?, ?, ?, ?, ?, ?)',
                [plan_name, price, daily_income, duration, total_profit, status || 'active']
            );
            res.json({ success: true, message: 'Plan created' });
        } else {
            res.json({ success: true, message: 'Plan created (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.put('/api/plans/admin/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (db) {
            await db.query('UPDATE plans SET status = ? WHERE id = ?', [status, id]);
            res.json({ success: true, message: 'Plan updated' });
        } else {
            res.json({ success: true, message: 'Plan updated (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/plans/admin/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            await db.query('DELETE FROM plans WHERE id = ?', [id]);
            res.json({ success: true, message: 'Plan deleted' });
        } else {
            res.json({ success: true, message: 'Plan deleted (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/deposit/admin/all', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        if (db) {
            const [rows] = await db.query(
                'SELECT d.*, u.full_name FROM deposits d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT ?',
                [parseInt(limit)]
            );
            res.json({ success: true, data: { data: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, full_name: 'Demo User', amount: 500, status: 'pending', created_at: new Date() }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/deposit/admin/:id/approve', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            const [deposit] = await db.query('SELECT * FROM deposits WHERE id = ?', [id]);
            if (deposit.length > 0) {
                await db.query('UPDATE deposits SET status = "approved" WHERE id = ?', [id]);
                await db.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [deposit[0].amount, deposit[0].user_id]);
            }
            res.json({ success: true, message: 'Deposit approved' });
        } else {
            res.json({ success: true, message: 'Deposit approved (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/deposit/admin/:id/reject', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            await db.query('UPDATE deposits SET status = "rejected" WHERE id = ?', [id]);
            res.json({ success: true, message: 'Deposit rejected' });
        } else {
            res.json({ success: true, message: 'Deposit rejected (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/withdraw/admin/all', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        if (db) {
            const [rows] = await db.query(
                'SELECT w.*, u.full_name FROM withdraws w JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC LIMIT ?',
                [parseInt(limit)]
            );
            res.json({ success: true, data: { data: rows } });
        } else {
            res.json({
                success: true,
                data: {
                    data: [
                        { id: 1, full_name: 'Demo User', amount: 500, status: 'pending', created_at: new Date() }
                    ]
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/withdraw/admin/:id/approve', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            await db.query('UPDATE withdraws SET status = "approved" WHERE id = ?', [id]);
            res.json({ success: true, message: 'Withdrawal approved' });
        } else {
            res.json({ success: true, message: 'Withdrawal approved (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/withdraw/admin/:id/reject', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            await db.query('UPDATE withdraws SET status = "rejected" WHERE id = ?', [id]);
            res.json({ success: true, message: 'Withdrawal rejected' });
        } else {
            res.json({ success: true, message: 'Withdrawal rejected (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/withdraw/admin/:id/paid', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (db) {
            const [withdraw] = await db.query('SELECT * FROM withdraws WHERE id = ?', [id]);
            if (withdraw.length > 0) {
                await db.query('UPDATE withdraws SET status = "paid" WHERE id = ?', [id]);
                await db.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [withdraw[0].amount, withdraw[0].user_id]);
            }
            res.json({ success: true, message: 'Withdrawal marked as paid' });
        } else {
            res.json({ success: true, message: 'Withdrawal marked as paid (demo mode)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== SETTINGS =====
app.get('/api/settings/public', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                settings: {
                    website_name: 'Mehro Earn Hub',
                    footer_text: 'Designed & Developed by Sanaullah. All Rights Reserved.',
                    contact_email: 'support@mehroearnhub.com',
                    contact_whatsapp: '+923001234567'
                },
                payment_methods: [
                    { id: 1, method_name: 'EasyPaisa', account_name: 'Mehro Earn Hub', account_number: '0333-1234567' },
                    { id: 2, method_name: 'JazzCash', account_name: 'Mehro Earn Hub', account_number: '0333-1234567' },
                    { id: 3, method_name: 'Bank Transfer', account_name: 'Mehro Earn Hub', account_number: 'PK123456789' }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/settings/admin/multiple', authenticate, async (req, res) => {
    try {
        const { settings } = req.body;
        // In real app, save to database
        res.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// SERVE HTML FILES
// =============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '01-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '12-admin.html'));
});

// =============================================
// START SERVER
// =============================================
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log('');
        console.log('========================================');
        console.log('🚀 MEHRO EARN HUB SERVER STARTED');
        console.log('========================================');
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`📱 User Panel: http://localhost:${PORT}/`);
        console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
        console.log('');
        console.log('🔑 DEMO MODE: Any email/password works!');
        console.log('💡 For real database: Install MySQL');
        console.log('========================================');
    });
}

startServer();
```