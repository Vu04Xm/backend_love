const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Kiểm tra xem biến môi trường có tồn tại không (Tránh lỗi undefined khi deploy)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.error("❌ CHƯA CẤU HÌNH BIẾN MÔI TRƯỜNG CLOUDINARY TRÊN RENDER!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'love_diary_assets',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
            // Bỏ bớt transformation nếu không cần thiết để giảm tải cho server khi upload
            transformation: [{ width: 1000, crop: "limit" }],
            public_id: `memory-${Date.now()}-${file.originalname.split('.')[0]}`
        };
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Tăng lên 10MB cho thoải mái khi dùng 4G/Wifi yếu
});

module.exports = { cloudinary, upload };