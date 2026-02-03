// src/models/db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "peminjaman_db",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .query("SELECT 1")
  .then(() => console.log("Berhasil konek ke database (pool)"))
  .catch((err) => console.error("Error waktu konek ke database", err));

module.exports = pool;

