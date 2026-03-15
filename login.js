const express = require('express');
const router = express.Router();
const db = require('./db');

// Route Đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!username || !password) {
            return res.status(400).json({ error: "Vui lòng nhập tài khoản và mật khẩu!" });
        }

        // Truy vấn khớp chính xác bảng 'users' của bạn
        const sql = 'SELECT id, username, role, email FROM users WHERE username = ? AND password = ?';
        const [rows] = await db.query(sql, [username, password]);

        if (rows.length > 0) {
            const user = rows[0];
            
            // Trả về thông tin user (Bạn có thể dùng JWT ở đây nếu muốn bảo mật hơn)
            res.json({ 
                success: true, 
                message: "Đăng nhập thành công!",
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role, // Trả về 'admin' hoặc 'user' theo DB của bạn
                    email: user.email
                }
            });
        } else {
            res.status(401).json({ error: "Tài khoản hoặc mật khẩu không đúng!" });
        }
    } catch (err) {
        console.error("🔥 Lỗi Đăng nhập:", err);
        res.status(500).json({ error: "Lỗi hệ thống", details: err.message });
    }
});

module.exports = router;