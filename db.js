const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  // Thêm giá trị mặc định vào sau dấu || để test nhanh
  host: process.env.DB_HOST, 
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  port: process.env.DB_PORT || 25363,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool.promise();