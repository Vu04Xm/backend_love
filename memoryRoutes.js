const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// --- HÀM BẪY LỖI TRUNG TÂM ---
// Giúp trả về phản hồi JSON chuẩn, tránh lỗi "undefined" ở Frontend
const handleCatchError = (res, err, message) => {
    console.error(`🔥 LỖI [${message}]:`, err);
    
    // Bẫy lỗi kết nối Database (thường gặp trên Render/Aiven)
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: "Mất kết nối Database",
            details: "Server không thể kết nối tới MySQL. Kiểm tra cấu hình SSL hoặc DB_HOST."
        });
    }

    res.status(500).json({ 
        error: message, 
        details: err.message || "Lỗi không xác định trên server",
        code: err.code 
    });
};

// 1. [READ] - Lấy danh sách kỷ niệm
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

// 2. [READ PHOTOS] - Lấy album ảnh của một kỷ niệm
router.get('/:id/photos', async (req, res) => {
    try {
        const { id } = req.params;
        // Khớp cột photo_url từ SQL Dump của bạn
        const [photos] = await db.query('SELECT id, photo_url, public_id FROM memory_photos WHERE memory_id = ?', [id]);
        res.json(photos);
    } catch (err) {
        handleCatchError(res, err, "Lỗi khi lấy album ảnh");
    }
});

// 3. [CREATE] - Thêm mới kỷ niệm
router.post('/', upload.array('images', 15), async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "Dữ liệu gửi lên trống (Empty Body)!" });
        }

        const { title, content, event_date } = req.body;
        const files = req.files;

        if (!title || !event_date) {
            return res.status(400).json({ error: "Tiêu đề và ngày tháng là bắt buộc!" });
        }

        // Ép kiểu ngày tháng để khớp định dạng DATE của MySQL (YYYY-MM-DD)
        const formattedDate = new Date(event_date).toISOString().split('T')[0];

        // Bước 1: Lưu vào bảng memories
        const [result] = await db.query(
            'INSERT INTO memories (title, content, event_date) VALUES (?, ?, ?)', 
            [title, content, formattedDate]
        );
        const memoryId = result.insertId;

        // Bước 2: Lưu ảnh nếu có
        if (files && files.length > 0) {
            try {
                const photoQueries = files.map(file => {
    return db.query(
        'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
        [memoryId, file.path, file.public_id]
    );
});
                await Promise.all(photoQueries);
            } catch (photoErr) {
                return res.status(207).json({ 
                    success: true, 
                    message: "Kỷ niệm đã lưu nhưng phần ảnh gặp sự cố.",
                    details: photoErr.message 
                });
            }
        }

        res.status(201).json({ success: true, message: "Kỷ niệm đã được niêm phong! ❤️" });
    } catch (err) { 
        handleCatchError(res, err, "Lỗi khi tạo kỷ niệm mới");
    }
});

// 4. [UPDATE] - Cập nhật kỷ niệm
router.put('/:id', upload.array('images', 15), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, event_date } = req.body;
        const files = req.files;

        const formattedDate = event_date ? new Date(event_date).toISOString().split('T')[0] : null;

        const [updateRes] = await db.query(
            'UPDATE memories SET title = ?, content = ?, event_date = ? WHERE id = ?',
            [title, content, formattedDate, id]
        );

        if (updateRes.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy kỷ niệm cần sửa!" });
        }

        if (files && files.length > 0) {
            // Xóa ảnh cũ trên Cloudinary
            const [oldPhotos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
            const deletePromises = oldPhotos.map(p => p.public_id ? cloudinary.uploader.destroy(p.public_id) : null);
            await Promise.all(deletePromises);

            // Cập nhật DB ảnh
            await db.query('DELETE FROM memory_photos WHERE memory_id = ?', [id]);
            const photoQueries = files.map(file => {
                return db.query(
                    'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
                    [id, file.path, file.filename]
                );
            });
            await Promise.all(photoQueries);
        }

        res.json({ success: true, message: "Đã cập nhật thay đổi! ✨" });
    } catch (err) {
        handleCatchError(res, err, "Lỗi khi cập nhật kỷ niệm");
    }
});

// 5. [DELETE] - Xóa kỷ niệm
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [photos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
        if (photos.length > 0) {
            const deleteCloudinaryPromises = photos.map(photo => {
                if (photo.public_id) return cloudinary.uploader.destroy(photo.public_id);
            });
            await Promise.all(deleteCloudinaryPromises);
        }

        const [delRes] = await db.query('DELETE FROM memories WHERE id = ?', [id]);
        if (delRes.affectedRows === 0) return res.status(404).json({ error: "Kỷ niệm không tồn tại." });

        res.json({ success: true, message: "Đã xóa vĩnh viễn! 🗑️" });
    } catch (err) { 
        handleCatchError(res, err, "Lỗi khi xóa kỷ niệm");
    }
});

// Middleware bắt lỗi Multer (Dung lượng ảnh, v.v.)
router.use((err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        return res.status(400).json({ 
            error: "Lỗi upload ảnh", 
            details: err.code === 'LIMIT_FILE_SIZE' ? "Ảnh quá lớn (Tối đa 10MB)" : err.message 
        });
    }
    next(err);
});
// 6. [RANDOM] - Lấy 1 ảnh ngẫu nhiên cho hiệu ứng Trái tim rơi
router.get('/random', async (req, res) => {
    try {
        // Lệnh SQL lấy 1 dòng ngẫu nhiên từ bảng ảnh
        const sql = `SELECT photo_url FROM memory_photos ORDER BY RAND() LIMIT 1`;
        const [rows] = await db.query(sql);

        if (rows.length > 0) {
            res.json({ image_url: rows[0].photo_url });
        } else {
            // Trường hợp DB chưa có ảnh nào
            res.status(404).json({ error: "Kho ảnh đang trống" });
        }
    } catch (err) {
        handleCatchError(res, err, "Lỗi khi lấy ảnh ngẫu nhiên");
    }
});

module.exports = router;