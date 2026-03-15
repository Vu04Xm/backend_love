const express = require('express');
const router = express.Router();
const db = require('./db');
const { cloudinary, upload } = require('./cloudinaryConfig');


// CREATE MEMORY
router.post('/', upload.array('images',15), async (req,res)=>{

  try{

    console.log("📩 BODY:", req.body);
    console.log("📸 FILES:", req.files);

    const { title, content, event_date } = req.body;

    if(!title || !event_date){
      return res.status(400).json({
        error:"Thiếu title hoặc event_date"
      });
    }

    const formattedDate = new Date(event_date).toISOString().split("T")[0];

    // tạo memory
    const [result] = await db.query(
      "INSERT INTO memories(title,content,event_date) VALUES(?,?,?)",
      [title,content,formattedDate]
    );

    const memoryId = result.insertId;

    // lưu ảnh
    if(req.files && req.files.length > 0){

      for(const file of req.files){

        console.log("📸 Cloudinary URL:", file.path);
        console.log("📸 Cloudinary ID:", file.filename);

        await db.query(
          "INSERT INTO memory_photos(memory_id,photo_url,public_id) VALUES(?,?,?)",
          [memoryId, file.path, file.filename]
        );

      }

    }

    res.status(201).json({
      success:true,
      message:"Memory created"
    });

  }
  catch(err){

    console.error("🔥 MEMORY CREATE ERROR:", err);

    res.status(500).json({
      error:"Create memory failed",
      message:err.message,
      stack:err.stack
    });

  }

});


module.exports = router;