const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Ưu tiên lấy Port từ Render Environment, nếu không có mới dùng 25363
    port: process.env.DB_PORT || 25367, 
    ssl: {
        rejectUnauthorized: false 
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Thêm log này để kiểm tra khi khởi động
console.log("--- Đang kết nối tới Database ---");
console.log("Host:", process.env.DB_HOST);
console.log("Port:", process.env.DB_PORT || 25367);

module.exports = pool.promise();