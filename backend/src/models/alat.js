const db = require('./db');

exports.getAll = (callback) => {
    const sql = `
    SELECT alat.*, kategori.nama_kategori
    FROM alat
    JOIN kategori ON alat.id_kategori = kategori.id_kategori
    `;
    db.query(sql, callback);
}

exports.create = (data, callback) => {
    const sql = `
    INSERT INTO alat (nama_alat, id_kategori, stok, kondisi)
    VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [
        data.nama_alat,
        data.id_kategori,
        data.stok,
        data.kondisi
    ], callback) 
}

exports.update = (id, data, callback) => {
    const sql = `
    UPDATE alat
    SET nama_alat=?, id_kategori=?, stok=?, kondisi=?
    WHERE id_alat=?
    `;
    db.query(sql, [
        data.nama_alat,
        data.id_kategori,
        data.stok,
        data.kondisi,
        id
    ], callback);
}

exports.delete = (id, callback) => {
    const sql = 'DELETE FROM alat WHERE id_alat=?';
    db.query(sql, [id], callback);
};
