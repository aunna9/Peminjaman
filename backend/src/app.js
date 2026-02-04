const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const peminjamanRoutes = require("./routes/peminjamanRoutes");
const alatRoutes = require("./routes/alatRoutes");
const kategoriRoutes = require("./routes/kategoriRoutes");
const pengembalianRoutes = require("./routes/pengembalianRoutes");
const peminjamRoutes = require("./routes/peminjamRoutes")

const app = express();
const port = 8080;

app.use(cors({
  origin: "http://localhost:5173", // URL Vite/Frontend kamu
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(bodyParser.json());

app.use("/api", userRoutes);
app.use("/api/peminjaman", peminjamanRoutes)
app.use("/api/alat", alatRoutes)
app.use("/api/kategori", kategoriRoutes)
app.use("/api", pengembalianRoutes)
app.use("/api/peminjam", peminjamRoutes)
console.log("✅ APP.JS INI YANG JALAN");

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
