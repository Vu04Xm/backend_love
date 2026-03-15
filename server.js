require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const memoryRoutes = require('./memoryRoutes');
const photoRoutes = require('./photoRoutes');
const placeRoutes = require('./placeRoutes');
const login=require('./login');

const app = express();

// CORS
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// QUAN TRỌNG: tăng limit upload
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ROUTES
app.use('/api/memories', memoryRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/auth',login);

// test server
app.get('/', (req,res)=>{
  res.send("Server running 🚀");
});

// middleware bắt lỗi chi tiết
app.use((err, req, res, next) => {

  console.error("🔥 SERVER ERROR FULL:", err);

  res.status(500).json({
    success:false,
    message:"Server error",
    error: err.message,
    stack: err.stack
  });

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
  console.log("🚀 Server running on port:", PORT);
});