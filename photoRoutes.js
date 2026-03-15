const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');

// --- 1. ĐƯA ROUTE /random LÊN ĐẦU ---
router.get('/random', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT image_url FROM photos ORDER BY RAND() LIMIT 1');
    if (rows.length > 0) {
      res.json({ image_url: rows[0].image_url });
    } else {
      res.status(404).json({ error: "Chưa có ảnh nào trong kho" });
    }
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy ảnh ngẫu nhiên" });
  }
});
router.put('/:id', async (req, res) => {
  const { caption } = req.body;
  await db.query('UPDATE photos SET caption = ? WHERE id = ?', [caption, req.params.id]);
  res.json({ success: true });
});
// [READ]
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM photos ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: "Lỗi lấy kho ảnh" }); 
  }
});

// [CREATE]
router.post('/', upload.single('images'), async (req, res) => {
  try {
    const { caption } = req.body;
    const image_url = req.file ? req.file.path : null;
    if (!image_url) return res.status(400).json({ error: "Chưa chọn ảnh!" });

    await db.query('INSERT INTO photos (image_url, caption) VALUES (?, ?)', [image_url, caption]);
    res.status(201).json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// [DELETE]
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT image_url FROM photos WHERE id = ?', [id]);
    
    if (rows.length > 0) {
      const imageUrl = rows[0].image_url;
      
      // Cách lấy publicId an toàn hơn bao gồm cả tên folder
      // Ví dụ imageUrl: ".../v1234/love_diary_assets/name.jpg"
      const parts = imageUrl.split('/');
      const fileNameWithExtension = parts.pop(); // "name.jpg"
      const folderName = parts.pop(); // "love_diary_assets"
      const publicId = `${folderName}/${fileNameWithExtension.split('.')[0]}`;

      // Xóa trên Cloudinary
      await cloudinary.uploader.destroy(publicId);
      
      // Xóa trong MySQL
      await db.query('DELETE FROM photos WHERE id = ?', [id]);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Không tìm thấy ảnh" });
    }
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

module.exports = router;