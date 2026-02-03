const db = require('./db');

const Kategori = {};

Kategori.getAll = (callback) => {
    const sql = 'SELECT * FROM kategori';
    db.query(sql, callback);
};

Kategori.getById = (id, callback) => {
    const sql = 'SELECT * FROM kategori WHERE id_kategori = ?';
    db.query(sql, [id], callback);
};

Kategori.create = (data, callback) => {
    const sql = 'INSERT INTO kategori (nama_kategori) VALUES (?)';
    db.query(sql, [data.nama_kategori], callback);
};

Kategori.update = (id, data, callback) => {
    const sql = 'UPDATE kategori SET nama_kategori = ? WHERE id_kategori = ?';
    db.query(sql, [data.nama_kategori, id], callback);
};

Kategori.delete = (id, callback) => {
    const sql = 'DELETE FROM kategori WHERE id_kategori = ?';
    db.query(sql, [id], callback);
};

module.exports = Kategori;