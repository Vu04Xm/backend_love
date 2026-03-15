const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// [READ] - Lấy danh sách kèm ảnh đại diện (Cover Image)
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT m.*, 
            (SELECT photo_url FROM memory_photos WHERE memory_id = m.id LIMIT 1) as cover_image
            FROM memories m 
            ORDER BY m.event_date DESC`;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách kỷ niệm từ Database" });
    }
});

// [READ PHOTOS] - Lấy toàn bộ album ảnh của 1 kỷ niệm (Cho modal xem chi tiết)
router.get('/:id/photos', async (req, res) => {
    try {
        const { id } = req.params;
        const [photos] = await db.query('SELECT * FROM memory_photos WHERE memory_id = ?', [id]);
        res.json(photos);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy album ảnh" });
    }
});

// [CREATE] - Thêm kỷ niệm mới
router.post('/', upload.array('images', 15), async (req, res) => {
    try {
        const { title, content, event_date } = req.body;
        const files = req.files;

        if (!title || !event_date) {
            return res.status(400).json({ error: "Tiêu đề và ngày tháng không được để trống!" });
        }

        // 1. Lưu thông tin vào bảng memories
        const [result] = await db.query(
            'INSERT INTO memories (title, content, event_date) VALUES (?, ?, ?)', 
            [title, content, event_date]
        );
        const memoryId = result.insertId;

        // 2. Nếu có ảnh, lưu link vào bảng memory_photos
        if (files && files.length > 0) {
            const photoQueries = files.map(file => {
                return db.query(
                    'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
                    [memoryId, file.path, file.filename]
                );
            });
            await Promise.all(photoQueries);
        }

        res.status(201).json({ success: true, message: "Kỷ niệm đã được lưu giữ! ❤️" });
    } catch (err) { 
    console.error("LỖI THẬT ĐÂY NÈ:", err); // Xem ở Terminal
    res.status(500).json({ error: err.message }); // Nó sẽ hiện lỗi này ở tab Network trên Chrome
}
});

// [DELETE] - Xóa kỷ niệm & Xóa ảnh trên Cloudinary
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Lấy tất cả public_id để xóa sạch ảnh trên Cloudinary trước
        const [photos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
        
        if (photos.length > 0) {
            const deleteCloudinaryPromises = photos.map(photo => {
                if (photo.public_id) {
                    return cloudinary.uploader.destroy(photo.public_id);
                }
                return Promise.resolve();
            });
            await Promise.all(deleteCloudinaryPromises);
        }

        // 2. Xóa trong Database
        // Vì đã có ON DELETE CASCADE nên chỉ cần xóa memories, memory_photos sẽ tự mất
        await db.query('DELETE FROM memories WHERE id = ?', [id]);

        res.json({ success: true, message: "Đã xóa kỷ niệm vĩnh viễn! 🗑️" });
    } catch (err) { 
        console.error("Lỗi Delete:", err);
        res.status(500).json({ error: "Lỗi khi xóa: " + err.message }); 
    }
});

module.exports = router;