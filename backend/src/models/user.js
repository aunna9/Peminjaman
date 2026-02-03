const db = require('./db');
const bcrypt = require('bcryptjs');

const User = {};

User.createUserTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id_user INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','petugas','peminjam') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.query(sql, (err) => {
        if (err) {
            console.error('Gagal membuat tabel users', err);
        } else {
            console.log('Tabel users siap');
        }
    })
}

User.create = async (data, callback) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const sql = `
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [data.username, hashedPassword, data.role], callback);
}

User.getAll = (callback) => {
    const sql = `SELECT id_user, username, role FROM users`;
    db.query(sql, callback);
}

User.getById = (id, callback) => {
    const sql = `SELECT id_user, username, role FROM users WHERE id_user = ?`;
    db.query(sql, [id], callback);
}

module.exports = User;
