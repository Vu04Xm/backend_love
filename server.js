require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const memoryRoutes = require('./memoryRoutes');
const photoRoutes = require('./photoRoutes');
const placeRoutes = require('./placeRoutes');

const app = express();

// 1. Cấu hình CORS chi tiết hơn để tránh lỗi khi CRUD trên Render
app.use(cors({
  origin: "*", // Khi deploy thật, nên thay "*" bằng link frontend của bạn
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 2. Middleware xử lý dữ liệu (Quan trọng: Đặt trước Routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Thêm cái này để xử lý FormData/URL encoded

// 3. Sử dụng Routes
app.use('/api/memories', memoryRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/places', placeRoutes);

// API Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT id, username, password, role FROM users WHERE username = ?', [username]);
    
    // Lưu ý: Trong thực tế nên dùng bcrypt để hash password, hiện tại bạn dùng text thuần
    if (rows.length === 0 || password !== rows[0].password) {
      return res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
    
    // Không nên trả về password về frontend
    const { password: _, ...userWithoutPassword } = rows[0];
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống khi đăng nhập" });
  }
});

app.get('/', (req, res) => {
  res.send('Server đang hoạt động bình thường! 🚀');
});

// 4. Xử lý lỗi tập trung (Giúp bạn debug nhanh hơn)
app.use((err, req, res, next) => {
  console.error("🔥 Lỗi Server:", err.stack);
  res.status(500).json({ error: "Có lỗi xảy ra trên server!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại port ${PORT}`));