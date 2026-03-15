const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 25363, // Port của Aiven từ ảnh trước là 25363
    ssl: {
        rejectUnauthorized: false // BẮT BUỘC có dòng này để chạy trên Render/Aiven
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = connection.promise();