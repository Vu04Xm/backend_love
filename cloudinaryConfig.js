const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

require('dotenv').config();

if(
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
){
  console.error("❌ CLOUDINARY ENV MISSING");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async(req,file)=>{

    console.log("📸 Upload file:", file.originalname);

    return {
      folder:"love_diary_assets",
      allowed_formats:["jpg","png","jpeg","gif","webp"],
      public_id:`memory-${Date.now()}`
    }

  }
});

const upload = multer({
  storage,
  limits:{
    fileSize:10 * 1024 * 1024
  }
});

module.exports = { cloudinary, upload };