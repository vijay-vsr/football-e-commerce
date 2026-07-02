const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'veepoo19_elite_jersey_secret_2025';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Image Upload (Multer) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeFilename = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeFilename);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const cleanToken = token.replace(/^["']|["']$/g, '');

  jwt.verify(cleanToken, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
      return res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
    req.user = user;
    next();
  });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin privileges required.' });
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Please provide name, email, and password.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.run(sql, [name.trim(), email.toLowerCase().trim(), hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed'))
          return res.status(400).json({ error: 'An account with this email already exists.' });
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
      }
      console.log(`✅ New user registered: ${email} (ID: ${this.lastID})`);
      res.json({ success: true, message: 'Account created successfully!' });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Please provide email and password.' });

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.get(sql, [email.toLowerCase().trim()], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Login failed. Please try again.' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${email} (Role: ${user.role})`);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address || null,
        phone: user.phone || null
      }
    });
  });
});

// ─── PRODUCT ROUTES ───────────────────────────────────────────────────────────

// Get all products
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];
  if (category && category !== 'all') {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  sql += ' ORDER BY id ASC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load products.' });
    res.json(rows);
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to load product.' });
    if (!row) return res.status(404).json({ error: 'Product not found.' });
    res.json(row);
  });
});

// Add product (Admin only)
app.post('/api/admin/products', authenticateToken, adminOnly, upload.single('image'), (req, res) => {
  const { name, price, category, description, stock, sizes } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price are required.' });

  const image = req.file ? req.file.filename : 'hd_real_madrid.png';
  const sql = 'INSERT INTO products (name, price, image, category, description, stock, sizes) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.run(sql, [name, parseFloat(price), image, category || 'home', description || '', parseInt(stock) || 50, sizes || 'S,M,L,XL,XXL'], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to add product.' });
    res.json({ id: this.lastID, success: true, message: 'Product added successfully!' });
  });
});

// Update product (Admin only)
app.put('/api/admin/products/:id', authenticateToken, adminOnly, upload.single('image'), (req, res) => {
  const { name, price, category, description, stock, sizes } = req.body;
  const updateFields = [];
  const params = [];

  if (name) { updateFields.push('name = ?'); params.push(name); }
  if (price) { updateFields.push('price = ?'); params.push(parseFloat(price)); }
  if (category) { updateFields.push('category = ?'); params.push(category); }
  if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
  if (stock) { updateFields.push('stock = ?'); params.push(parseInt(stock)); }
  if (sizes) { updateFields.push('sizes = ?'); params.push(sizes); }
  if (req.file) { updateFields.push('image = ?'); params.push(req.file.filename); }

  if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

  params.push(req.params.id);
  const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update product.' });
    res.json({ success: true, message: 'Product updated!' });
  });
});

// Delete product (Admin only)
app.delete('/api/admin/products/:id', authenticateToken, adminOnly, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete product.' });
    res.json({ success: true, message: 'Product deleted.' });
  });
});

// ─── USER ROUTES ──────────────────────────────────────────────────────────────

// Get profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const sql = 'SELECT id, name, email, role, address, phone, created_at FROM users WHERE id = ?';
  db.get(sql, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Failed to load profile.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  });
});

// Update profile
app.post('/api/user/update', authenticateToken, (req, res) => {
  const { address, phone } = req.body;
  if (!address || !phone) return res.status(400).json({ error: 'Address and phone are required.' });

  const sql = 'UPDATE users SET address = ?, phone = ? WHERE id = ?';
  db.run(sql, [address.trim(), phone.trim(), req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update profile.' });
    res.json({ success: true, message: 'Profile updated successfully!' });
  });
});

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────

// Create order
app.post('/api/orders', authenticateToken, (req, res) => {
  const { total, items, paymentId } = req.body;
  if (!total || !items) return res.status(400).json({ error: 'Order total and items are required.' });

  const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
  const sql = 'INSERT INTO orders (user_id, total, items, payment_id) VALUES (?, ?, ?, ?)';
  db.run(sql, [req.user.id, parseFloat(total), itemsJson, paymentId || null], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to place order.' });
    console.log(`✅ Order placed: #${this.lastID} by user ${req.user.id} | ₹${total}`);
    res.json({ id: this.lastID, success: true, message: 'Order placed successfully! SIUUU!' });
  });
});

// Get my orders
app.get('/api/orders', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
  db.all(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load orders.' });
    res.json(rows);
  });
});

// Admin: get all orders
app.get('/api/admin/orders', authenticateToken, adminOnly, (req, res) => {
  const sql = `
    SELECT orders.*, users.name AS user_name, users.email AS user_email, users.phone AS user_phone
    FROM orders
    JOIN users ON orders.user_id = users.id
    ORDER BY orders.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load orders.' });
    res.json(rows);
  });
});

// Admin: update order status
app.post('/api/admin/orders/status', authenticateToken, adminOnly, (req, res) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) return res.status(400).json({ error: 'Order ID and status are required.' });

  const validStatuses = ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update order status.' });
    res.json({ success: true, message: `Order #${orderId} marked as ${status}.` });
  });
});

// ─── ADMIN USER ROUTES ────────────────────────────────────────────────────────

// Get all users
app.get('/api/admin/users', authenticateToken, adminOnly, (req, res) => {
  const sql = 'SELECT id, name, email, role, address, phone, created_at FROM users ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load users.' });
    res.json(rows);
  });
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account.' });

  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete user.' });
    res.json({ success: true, message: 'User removed.' });
  });
});

// ─── PAYMENT ROUTES ───────────────────────────────────────────────────────────

// Initiate payment
app.post('/api/payments/initiate', authenticateToken, (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).json({ error: 'Valid amount is required.' });

  const paymentId = 'ELITE-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const sql = "INSERT INTO payments (id, user_id, amount, status) VALUES (?, ?, ?, 'pending')";
  db.run(sql, [paymentId, req.user.id, parseFloat(amount)], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to initiate payment.' });
    console.log(`💳 Payment initiated: ${paymentId} | ₹${amount} | User: ${req.user.id}`);
    res.json({ paymentId });
  });
});

// Check payment status
app.get('/api/payments/status/:id', (req, res) => {
  db.get('SELECT status FROM payments WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to check payment.' });
    if (!row) return res.status(404).json({ error: 'Payment not found.' });
    res.json({ status: row.status });
  });
});

// Mark payment as success (called when user clicks "I've paid")
app.post('/api/payments/success/:id', (req, res) => {
  db.run("UPDATE payments SET status = 'completed' WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to confirm payment.' });
    console.log(`✅ Payment confirmed: ${req.params.id}`);
    res.json({ success: true });
  });
});

// Admin: get all payments
app.get('/api/admin/payments', authenticateToken, adminOnly, (req, res) => {
  const sql = `
    SELECT payments.*, users.name AS user_name, users.email AS user_email
    FROM payments
    JOIN users ON payments.user_id = users.id
    ORDER BY payments.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load payments.' });
    res.json(rows);
  });
});

// ─── SERVER INFO ──────────────────────────────────────────────────────────────
app.get('/api/server-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  let ip = 'localhost';
  for (const devName in interfaces) {
    for (const alias of interfaces[devName]) {
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        ip = alias.address;
      }
    }
  }
  res.json({ ip, port: PORT, status: 'online', version: '2.0' });
});

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  // For all non-API routes, serve the frontend
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🏆 ===============================================');
  console.log('⚽  VeePoo19 Elite Jersey Shop — BACKEND ONLINE');
  console.log('🏆 ===============================================');
  console.log(`🌐  Open in browser: http://localhost:${PORT}`);
  console.log(`📦  API running at:  http://localhost:${PORT}/api`);
  console.log('');
  console.log('💡 TIP: First user to register becomes the Admin!');
  console.log('🏆 ===============================================');
  console.log('');
});
