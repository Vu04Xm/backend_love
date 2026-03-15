const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// --- HÀM BẪY LỖI CHUNG ---
const handleCatchError = (res, err, message) => {
    console.error(`🔥 LỖI [${message}]:`, err);
    res.status(500).json({ 
        error: message, 
        details: err.message,
        code: err.code // Trả về mã lỗi SQL nếu có
    });
};

// 1. [READ] - Lấy danh sách
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
        handleCatchError(res, err, "Lỗi khi lấy danh sách kỷ niệm");
    }
});

// 2. [READ PHOTOS] - Lấy album ảnh
router.get('/:id/photos', async (req, res) => {
    try {
        const { id } = req.params;
        const [photos] = await db.query('SELECT * FROM memory_photos WHERE memory_id = ?', [id]);
        res.json(photos);
    } catch (err) {
        handleCatchError(res, err, "Lỗi khi lấy album ảnh");
    }
});

// 3. [CREATE] - Thêm mới (Có bẫy lỗi từng bước)
router.post('/', upload.array('images', 15), async (req, res) => {
    try {
        const { title, content, event_date } = req.body;
        const files = req.files;

        // Bẫy lỗi 1: Validate đầu vào
        if (!title || !event_date) {
            return res.status(400).json({ error: "Tiêu đề và ngày tháng là bắt buộc!" });
        }

        // 2. Lưu vào bảng memories
        const [result] = await db.query(
            'INSERT INTO memories (title, content, event_date) VALUES (?, ?, ?)', 
            [title, content, event_date]
        );
        const memoryId = result.insertId;

        // 3. Lưu vào bảng memory_photos (nếu có ảnh)
        if (files && files.length > 0) {
            try {
                const photoQueries = files.map(file => {
                    return db.query(
                        'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
                        [memoryId, file.path, file.filename]
                    );
                });
                await Promise.all(photoQueries);
            } catch (photoErr) {
                // Nếu lưu ảnh lỗi, ta vẫn giữ record memory nhưng báo lỗi phần ảnh
                return res.status(207).json({ 
                    success: true, 
                    message: "Kỷ niệm đã lưu nhưng một số ảnh gặp lỗi.",
                    details: photoErr.message 
                });
            }
        }

        res.status(201).json({ success: true, message: "Kỷ niệm đã được lưu giữ! ❤️" });
    } catch (err) { 
        handleCatchError(res, err, "Lỗi khi tạo kỷ niệm mới");
    }
});

// 4. [UPDATE] - Cập nhật (Bẫy lỗi logic ảnh)
router.put('/:id', upload.array('images', 15), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, event_date } = req.body;
        const files = req.files;

        // 1. Cập nhật thông tin text
        const [updateRes] = await db.query(
            'UPDATE memories SET title = ?, content = ?, event_date = ? WHERE id = ?',
            [title, content, event_date, id]
        );

        if (updateRes.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy kỷ niệm để cập nhật!" });
        }

        // 2. Nếu có upload ảnh mới -> Thay thế ảnh cũ
        if (files && files.length > 0) {
            // Lấy public_id ảnh cũ để xóa trên Cloudinary
            const [oldPhotos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
            const deletePromises = oldPhotos.map(p => p.public_id ? cloudinary.uploader.destroy(p.public_id) : null);
            await Promise.all(deletePromises);

            // Xóa record cũ trong DB và thêm mới
            await db.query('DELETE FROM memory_photos WHERE memory_id = ?', [id]);
            const photoQueries = files.map(file => {
                return db.query(
                    'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
                    [id, file.path, file.filename]
                );
            });
            await Promise.all(photoQueries);
        }

        res.json({ success: true, message: "Cập nhật thành công! ✨" });
    } catch (err) {
        handleCatchError(res, err, "Lỗi khi cập nhật kỷ niệm");
    }
});

// 5. [DELETE] - Xóa (Bẫy lỗi Cloudinary)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Tìm ảnh để xóa trên Cloudinary trước
        const [photos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
        
        if (photos.length > 0) {
            const deleteCloudinaryPromises = photos.map(photo => {
                if (photo.public_id) {
                    return cloudinary.uploader.destroy(photo.public_id).catch(err => {
                        console.warn(`⚠️ Không thể xóa ảnh ${photo.public_id} trên Cloudinary:`, err.message);
                    });
                }
            });
            await Promise.all(deleteCloudinaryPromises);
        }

        // 2. Xóa trong Database
        const [delRes] = await db.query('DELETE FROM memories WHERE id = ?', [id]);
        
        if (delRes.affectedRows === 0) {
            return res.status(404).json({ error: "Kỷ niệm không tồn tại hoặc đã bị xóa trước đó." });
        }

        res.json({ success: true, message: "Đã xóa kỷ niệm vĩnh viễn! 🗑️" });
    } catch (err) { 
        handleCatchError(res, err, "Lỗi khi xóa kỷ niệm");
    }
});

module.exports = router;