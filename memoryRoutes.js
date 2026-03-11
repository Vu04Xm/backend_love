const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// [READ] - Lấy danh sách kèm ảnh đại diện đầu tiên
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT m.*, 
      (SELECT photo_url FROM memory_photos WHERE memory_id = m.id LIMIT 1) as cover_image
      FROM memories m ORDER BY m.event_date DESC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy dữ liệu kỷ niệm" });
  }
});

// [READ DETAIL PHOTOS] - Lấy tất cả ảnh của 1 kỷ niệm
router.get('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const [photos] = await db.query('SELECT * FROM memory_photos WHERE memory_id = ?', [id]);
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy album ảnh" });
  }
});

// [CREATE] - Thêm kỷ niệm và nhiều ảnh cùng lúc
router.post('/', upload.array('images', 15), async (req, res) => {
  try {
    const { title, content, event_date } = req.body;
    const files = req.files;

    if (!title || !event_date) return res.status(400).json({ error: "Thiếu thông tin!" });

    // 1. Lưu vào bảng memories
    const [result] = await db.query(
      'INSERT INTO memories (title, content, event_date) VALUES (?, ?, ?)', 
      [title, content, event_date]
    );
    const memoryId = result.insertId;

    // 2. Lưu danh sách ảnh vào bảng memory_photos
    if (files && files.length > 0) {
      const photoQueries = files.map(file => {
        return db.query(
          'INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
          [memoryId, file.path, file.filename]
        );
      });
      await Promise.all(photoQueries);
    }

    res.status(201).json({ success: true, message: "Đã lưu kỷ niệm và album! ❤️" });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// [UPDATE] - Cập nhật thông tin (Giữ nguyên hoặc thêm ảnh mới nếu cần)
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, event_date } = req.body;
    const files = req.files;

    // Cập nhật thông tin chữ trước
    await db.query('UPDATE memories SET title = ?, content = ?, event_date = ? WHERE id = ?', 
      [title, content, event_date, id]);

    // Nếu có đăng thêm ảnh mới thì chèn thêm vào bảng photos
    if (files && files.length > 0) {
      const photoQueries = files.map(file => {
        return db.query('INSERT INTO memory_photos (memory_id, photo_url, public_id) VALUES (?, ?, ?)', 
          [id, file.path, file.filename]);
      });
      await Promise.all(photoQueries);
    }

    res.json({ success: true, message: "Cập nhật thành công! ✨" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// [DELETE] - Xóa kỷ niệm và toàn bộ ảnh trên Cloudinary
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Tìm tất cả public_id của ảnh thuộc kỷ niệm này để xóa trên Cloudinary
    const [photos] = await db.query('SELECT public_id FROM memory_photos WHERE memory_id = ?', [id]);
    
    const deleteCloudinary = photos.map(photo => {
      if (photo.public_id) return cloudinary.uploader.destroy(photo.public_id);
    });
    await Promise.all(deleteCloudinary);

    // 2. Xóa trong DB (SQL sẽ tự xóa memory_photos nếu bạn cài ON DELETE CASCADE)
    await db.query('DELETE FROM memory_photos WHERE memory_id = ?', [id]);
    await db.query('DELETE FROM memories WHERE id = ?', [id]);

    res.json({ success: true, message: "Đã xóa kỷ niệm vĩnh viễn! 🗑️" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;