const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// 1. Lấy danh sách
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM memories ORDER BY event_date DESC');
        res.json(rows);
    } catch (err) {
        console.error("❌ Lỗi GET memories:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Thêm mới (POST) - Đã có chữ S ở 'images'
router.post('/', upload.array('images', 15), async (req, res) => {
    try {
        const { title, content, event_date } = req.body;
        const files = req.files;

        if (!title || !event_date) {
            return res.status(400).json({ error: "Thiếu tiêu đề hoặc ngày!" });
        }

        // Bước 1: Insert vào bảng memories
        const [result] = await db.query(
            'INSERT INTO memories (title, content, event_date) VALUES (?, ?, ?)', 
            [title, content, event_date]
        );
        const memoryId = result.insertId;

        // Bước 2: Insert ảnh nếu có
        if (files && files.length > 0) {
            const photoQueries = files.map(file => {
                return db.query(
                    'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
                    [memoryId, file.path, file.filename]
                );
            });
            await Promise.all(photoQueries);
        }

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("❌ LỖI TẠI BACKEND:", err); // Log này sẽ hiện trên Render Dashboard
        res.status(500).json({ 
            error: "Lỗi Server Nội Bộ", 
            details: err.message,
            sqlMessage: err.sqlMessage // Hiện lỗi SQL nếu có
        });
    }
});

module.exports = router;