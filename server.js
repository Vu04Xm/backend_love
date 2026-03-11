require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const memoryRoutes = require('./memoryRoutes');
const photoRoutes = require('./photoRoutes');
const placeRoutes = require('./placeRoutes'); // 1. Import route mới ở đây

const app = express();
app.use(cors());
app.use(express.json());

// Sử dụng Routes
app.use('/api/memories', memoryRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/places', placeRoutes); // 2. Khai báo đường dẫn API cho Places

// API Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT id, username, password, role FROM users WHERE username = ?', [username]);
    if (rows.length === 0 || password !== rows[0].password) {
      return res.status(401).json({ success: false, message: "Sai tài khoản!" });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại port ${PORT}`));