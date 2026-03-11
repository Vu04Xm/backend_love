    const mysql = require('mysql2');
    require('dotenv').config();

    // Tạo pool kết nối để tối ưu hiệu suất
    const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 25367, // Thêm cổng của bạn vào đây
    ssl: {
        rejectUnauthorized: false // Bắt buộc phải có để kết nối tới Aiven/Cloud DB
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
    });

    module.exports = pool.promise();