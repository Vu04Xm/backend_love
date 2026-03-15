const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// KẾT NỐI DATABASE
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "love_project",
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.log("Lỗi kết nối MySQL:", err);
    } else {
        console.log("Đã kết nối MySQL");
    }
});


// API LOGIN
app.post("/api/login", (req, res) => {

    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }

        if (result.length === 0) {
            return res.json({
                success: false,
                message: "Sai tài khoản hoặc mật khẩu"
            });
        }

        const user = result[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });

    });

});


// SERVER
const PORT = 3000;

app.listen(PORT, () => {
    console.log("Server chạy tại http://localhost:" + PORT);
});