const express = require('express');
const router = express.Router();
const db = require('./db');

/**
 * ROUTE: ĐĂNG NHẬP
 * Phù hợp với cơ chế lưu sessionStorage ở Frontend
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Kiểm tra đầu vào
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: "Vui lòng nhập tài khoản và mật khẩu nhé! ❤️" 
            });
        }

        // 2. Truy vấn Database (Khớp chính xác bảng users của bạn)
        const sql = 'SELECT id, username, role, email FROM users WHERE username = ? AND password = ?';
        const [rows] = await db.query(sql, [username, password]);

        // 3. Xử lý kết quả đăng nhập
        if (rows.length > 0) {
            const user = rows[0];

            // Trả về dữ liệu để Frontend đưa vào sessionStorage
            return res.json({ 
                success: true, 
                message: "Đăng nhập thành công! Đang vào nhà thôi... 🏠",
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    email: user.email,
                    loginAt: new Date().toISOString()
                }
            });
        } else {
            // Sai thông tin đăng nhập
            return res.status(401).json({ 
                success: false,
                error: "Tài khoản hoặc mật khẩu không đúng rồi, kiểm tra lại nhé! ❌" 
            });
        }

    } catch (err) {
        console.error("🔥 Lỗi Backend Auth:", err);
        return res.status(500).json({ 
            success: false,
            error: "Lỗi hệ thống, thử lại sau nhé!", 
            details: err.message 
        });
    }
});

/**
 * ROUTE: KIỂM TRA PHIÊN (Check Session)
 * Cực kỳ quan trọng khi người dùng ấn REFRESH (F5)
 * Frontend sẽ lấy ID từ sessionStorage và gọi vào đây để xác nhận user vẫn tồn tại
 */
router.get('/check-session/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT id, username, role, email FROM users WHERE id = ?';
        const [rows] = await db.query(sql, [id]);
        
        if (rows.length > 0) {
            res.json({ 
                success: true, 
                user: rows[0] 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: "Phiên đăng nhập không hợp lệ" 
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
});

module.exports = router;