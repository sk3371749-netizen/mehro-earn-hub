const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// =============================================
// API ROUTES
// =============================================

// Plans API
app.get('/api/plans', (req, res) => {
    res.json({
        success: true,
        data: {
            plans: [
                { id: 1, plan_name: 'Starter', price: 500, daily_income: 5, duration: 30, total_profit: 650, min_withdraw: 10, max_withdraw: 100 },
                { id: 2, plan_name: 'Silver', price: 1000, daily_income: 12, duration: 45, total_profit: 1540, min_withdraw: 20, max_withdraw: 200 },
                { id: 3, plan_name: 'Gold', price: 2500, daily_income: 35, duration: 60, total_profit: 4600, min_withdraw: 50, max_withdraw: 500 }
            ]
        }
    });
});

// User Dashboard API
app.get('/api/user/dashboard', (req, res) => {
    res.json({
        success: true,
        data: {
            stats: {
                full_name: 'Demo User',
                wallet_balance: 5000,
                total_deposits: 10000,
                total_withdraws: 2000,
                total_referrals: 5,
                pending_withdraw: 1,
                today_earnings: 50,
                total_earnings: 1500
            },
            recent_transactions: [
                { id: 1, type: 'deposit', amount: 1000, status: 'completed', description: 'Deposit', transaction_date: new Date() },
                { id: 2, type: 'withdraw', amount: 500, status: 'pending', description: 'Withdraw', transaction_date: new Date() }
            ],
            recent_notifications: [
                { id: 1, title: 'Welcome', message: 'Welcome to Mehro Earn Hub!', type: 'system', created_at: new Date() }
            ]
        }
    });
});

// User Profile API
app.get('/api/user/profile', (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: 1,
                full_name: 'Demo User',
                email: 'demo@demo.com',
                phone: '0300-1234567',
                wallet_balance: 5000,
                total_earnings: 1500,
                referral_code: 'DEMO123',
                status: 'active',
                registration_date: new Date(),
                last_login: new Date()
            }
        }
    });
});

// Login API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    res.json({
        success: true,
        data: {
            token: 'demo_token_' + Date.now(),
            user: {
                id: 1,
                full_name: 'Demo User',
                email: email || 'demo@demo.com',
                wallet_balance: 5000
            }
        }
    });
});

// Register API
app.post('/api/auth/register', (req, res) => {
    const { full_name, email, password } = req.body;
    res.json({
        success: true,
        data: {
            token: 'demo_token_' + Date.now(),
            user: {
                id: 1,
                full_name: full_name || 'Demo User',
                email: email || 'demo@demo.com',
                wallet_balance: 5000
            }
        }
    });
});

// Wallet Summary API
app.get('/api/wallet/summary', (req, res) => {
    res.json({
        success: true,
        data: {
            balance: { wallet_balance: 5000, pending_balance: 500, total_earnings: 1500 },
            summary: {
                total_deposits: 10000,
                total_withdraws: 2000,
                referral_bonus: 500,
                referral_salary: 100,
                manual_bonus: 200
            },
            today_earnings: 50
        }
    });
});

// Wallet Transactions API
app.get('/api/wallet/transactions', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, type: 'deposit', amount: 1000, status: 'completed', description: 'Deposit', transaction_date: new Date() },
                { id: 2, type: 'withdraw', amount: 500, status: 'pending', description: 'Withdraw', transaction_date: new Date() },
                { id: 3, type: 'daily_earning', amount: 50, status: 'completed', description: 'Daily Earnings', transaction_date: new Date() }
            ],
            total: 3
        }
    });
});

// Withdraw Request API
app.post('/api/wallet/withdraw', (req, res) => {
    const { amount, payment_method, account_name, account_number } = req.body;
    res.json({
        success: true,
        message: 'Withdrawal request submitted successfully'
    });
});

// Withdraw History API
app.get('/api/wallet/withdraws', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, amount: 500, payment_method: 'EasyPaisa', status: 'paid', created_at: new Date() },
                { id: 2, amount: 300, payment_method: 'JazzCash', status: 'pending', created_at: new Date() }
            ]
        }
    });
});

// Referral Stats API
app.get('/api/referral/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            stats: {
                total_referrals: 5,
                active_referrals: 3,
                pending_referrals: 2,
                today_referrals: 1,
                total_bonus: 500,
                total_salary: 100
            },
            settings: {
                bonus_amount: 50,
                bonus_enabled: true,
                salary_amount: 10,
                salary_enabled: true,
                min_active_referrals: 5
            }
        }
    });
});

// Referral List API
app.get('/api/referral/list', (req, res) => {
    res.json({
        success: true,
        data: {
            referrals: [
                { full_name: 'Ali', user_id: 'MEHRO001', status: 'active', created_at: new Date() },
                { full_name: 'Ahmed', user_id: 'MEHRO002', status: 'pending', created_at: new Date() }
            ]
        }
    });
});

// Referral Link API
app.get('/api/referral/link', (req, res) => {
    res.json({
        success: true,
        data: {
            referral_link: 'https://mehro-earn-hub.onrender.com/02-register.html?ref=DEMO123',
            referral_code: 'DEMO123'
        }
    });
});

// Support Tickets API
app.get('/api/support', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, ticket_id: 'TKT001', subject: 'Test Ticket', status: 'open', category: 'deposit', message: 'Test message', created_at: new Date() }
            ]
        }
    });
});

// Create Support Ticket API
app.post('/api/support', (req, res) => {
    const { category, subject, message } = req.body;
    res.json({
        success: true,
        message: 'Ticket created successfully'
    });
});

// Support Ticket Detail API
app.get('/api/support/:id', (req, res) => {
    res.json({
        success: true,
        data: {
            ticket: { id: 1, ticket_id: 'TKT001', subject: 'Test Ticket', status: 'open', category: 'deposit', message: 'Test message', created_at: new Date() },
            replies: []
        }
    });
});

// Support Reply API
app.post('/api/support/:id/reply', (req, res) => {
    const { message } = req.body;
    res.json({
        success: true,
        message: 'Reply sent successfully'
    });
});

// Close Ticket API
app.put('/api/support/:id/close', (req, res) => {
    res.json({
        success: true,
        message: 'Ticket closed successfully'
    });
});

// Admin Dashboard API
app.get('/api/admin/dashboard', (req, res) => {
    res.json({
        success: true,
        data: {
            users: { total_users: 25, active_users: 20, today_registrations: 2 },
            deposits: { total_deposit_amount: 50000, pending: 3, today_deposits: 1 },
            withdraws: { total_withdraw_amount: 20000, pending: 2, today_withdraws: 1 },
            plans: { total_plans: 3, active_plans: 3 },
            tickets: { total_tickets: 5, open: 2, in_progress: 1 },
            earnings: { total_earnings: 15000, today_earnings: 100 },
            recent_activities: [
                { action: 'user_login', description: 'User logged in', created_at: new Date() },
                { action: 'deposit_approve', description: 'Deposit approved', created_at: new Date() }
            ],
            recent_notifications: [
                { title: 'New User', message: 'New user registered', type: 'system', created_at: new Date() }
            ]
        }
    });
});

// Admin Users API
app.get('/api/admin/users', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, full_name: 'Demo User', email: 'demo@demo.com', user_id: 'MEHRO001', status: 'active', wallet_balance: 5000, registration_date: new Date() },
                { id: 2, full_name: 'Test User', email: 'test@test.com', user_id: 'MEHRO002', status: 'active', wallet_balance: 3000, registration_date: new Date() }
            ],
            total: 2
        }
    });
});

// Change User Status API
app.patch('/api/admin/users/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    res.json({
        success: true,
        message: 'User status updated successfully'
    });
});

// Admin Plans API
app.get('/api/plans/admin/all', (req, res) => {
    res.json({
        success: true,
        data: {
            plans: [
                { id: 1, plan_name: 'Starter', price: 500, daily_income: 5, duration: 30, total_profit: 650, status: 'active', total_purchases: 10 },
                { id: 2, plan_name: 'Silver', price: 1000, daily_income: 12, duration: 45, total_profit: 1540, status: 'active', total_purchases: 5 },
                { id: 3, plan_name: 'Gold', price: 2500, daily_income: 35, duration: 60, total_profit: 4600, status: 'active', total_purchases: 3 }
            ]
        }
    });
});

// Create Plan API
app.post('/api/plans/admin', (req, res) => {
    const { plan_name, price, daily_income, duration, total_profit, status } = req.body;
    res.json({
        success: true,
        message: 'Plan created successfully'
    });
});

// Update Plan API
app.put('/api/plans/admin/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    res.json({
        success: true,
        message: 'Plan updated successfully'
    });
});

// Delete Plan API
app.delete('/api/plans/admin/:id', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Plan deleted successfully'
    });
});

// Admin Deposits API
app.get('/api/deposit/admin/all', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, full_name: 'Demo User', amount: 500, plan_name: 'Starter', status: 'pending', payment_method: 'EasyPaisa', created_at: new Date() }
            ]
        }
    });
});

// Approve Deposit API
app.put('/api/deposit/admin/:id/approve', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Deposit approved successfully'
    });
});

// Reject Deposit API
app.put('/api/deposit/admin/:id/reject', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Deposit rejected successfully'
    });
});

// Admin Withdrawals API
app.get('/api/withdraw/admin/all', (req, res) => {
    res.json({
        success: true,
        data: {
            data: [
                { id: 1, full_name: 'Demo User', amount: 500, payment_method: 'EasyPaisa', status: 'pending', created_at: new Date() }
            ]
        }
    });
});

// Approve Withdraw API
app.put('/api/withdraw/admin/:id/approve', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Withdrawal approved successfully'
    });
});

// Reject Withdraw API
app.put('/api/withdraw/admin/:id/reject', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Withdrawal rejected successfully'
    });
});

// Mark Withdraw Paid API
app.put('/api/withdraw/admin/:id/paid', (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: 'Withdrawal marked as paid successfully'
    });
});

// Public Settings API
app.get('/api/settings/public', (req, res) => {
    res.json({
        success: true,
        data: {
            settings: {
                website_name: 'Mehro Earn Hub',
                footer_text: 'Designed & Developed by Sanaullah. All Rights Reserved.',
                contact_email: 'support@mehroearnhub.com',
                contact_whatsapp: '+923001234567',
                business_address: '123 Main Street, City, Country',
                working_hours: 'Mon-Sat: 9:00 AM - 6:00 PM'
            },
            payment_methods: [
                { id: 1, method_name: 'EasyPaisa', account_name: 'Mehro Earn Hub', account_number: '0333-1234567' },
                { id: 2, method_name: 'JazzCash', account_name: 'Mehro Earn Hub', account_number: '0333-1234567' },
                { id: 3, method_name: 'Bank Transfer', account_name: 'Mehro Earn Hub', account_number: 'PK123456789' }
            ],
            announcements: [
                { title: 'Welcome', content: 'Welcome to Mehro Earn Hub!', type: 'running' }
            ],
            banners: [
                { title: 'Welcome Banner', image: '/shared/assets/images/banner1.jpg', link: '/plans' }
            ]
        }
    });
});

// Save Settings API
app.post('/api/settings/admin/multiple', (req, res) => {
    const { settings } = req.body;
    res.json({
        success: true,
        message: 'Settings saved successfully'
    });
});

// =============================================
// SERVE HTML FILES
// =============================================

// Home page - Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '01-login.html'));
});

// Admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '12-admin.html'));
});

// All other HTML files
app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, `${page}.html`));
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('🚀 MEHRO EARN HUB SERVER STARTED');
    console.log('========================================');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📱 User Panel: http://localhost:${PORT}/`);
    console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
    console.log('🔑 DEMO MODE: Any email/password works!');
    console.log('========================================');
});
