const express = require('express');
const router = express.Router();
const db = require('./db'); 
const { cloudinary, upload } = require('./cloudinaryConfig');

// [POST] - Thêm địa điểm và nhiều ảnh
router.post('/', upload.array('images', 10), async (req, res) => {
  const { title, description, event_date } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Vui lòng chọn ít nhất 1 ảnh!" });
  }

  try {
    // Bước 1: Lưu vào bảng 'events'
    const [eventResult] = await db.query(
      'INSERT INTO events (title, description, event_date) VALUES (?, ?, ?)',
      [title, description, event_date]
    );
    const eventId = eventResult.insertId;

    // Bước 2: Lưu vào bảng 'event_photos' (Khớp các cột bạn đã gửi)
    const photoQueries = files.map(file => {
      return db.query(
        'INSERT INTO event_photos (event_id, image_url, public_id) VALUES (?, ?, ?)',
        [eventId, file.path, file.filename]
      );
    });

    await Promise.all(photoQueries);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] - Lấy danh sách kèm ảnh bìa
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT e.*, 
      (SELECT image_url FROM event_photos WHERE event_id = e.id LIMIT 1) as cover_image
      FROM events e ORDER BY e.event_date DESC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// [GET] - Lấy tất cả ảnh của một sự kiện cụ thể (Dùng cho Album)
router.get('/:id/photos', async (req, res) => {
  const eventId = req.params.id;
  try {
    const [photos] = await db.query(
      'SELECT * FROM event_photos WHERE event_id = ?', 
      [eventId]
    );
    res.json(photos); // Trả về mảng các ảnh có cùng event_id
  } catch (err) {
    console.error("Lỗi lấy ảnh album:", err);
    res.status(500).json({ error: err.message });
  }
});
router.delete('/:id', async (req, res) => {
  const eventId = req.params.id;
  try {
    // 1. Lấy public_id của tất cả ảnh để xóa trên Cloudinary
    const [photos] = await db.query('SELECT public_id FROM event_photos WHERE event_id = ?', [eventId]);
    
    for (const photo of photos) {
      if (photo.public_id) await cloudinary.uploader.destroy(photo.public_id);
    }

    // 2. Xóa trong DB (SQL sẽ tự xóa event_photos nếu bạn để ON DELETE CASCADE, nếu không hãy xóa thủ công)
    await db.query('DELETE FROM event_photos WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM events WHERE id = ?', [eventId]);

    res.json({ success: true, message: "Đã xóa kỷ niệm!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;