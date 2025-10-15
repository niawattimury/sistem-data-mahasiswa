require("dotenv").config();

// server.js
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const port = 3000;


// connect
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("❌ Gagal koneksi ke database:", err);
    process.exit(1);
  }
  console.log("✅ Koneksi ke database berhasil!");
});

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <== tambahan penting

// Upload Foto ke Public/uploads
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Folder 'uploads' dibuat otomatis");
}

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("Format file tidak diizinkan!"));
  }
});


//ROUTES

// Halaman utama
app.get("/", (req, res) => {
  res.render("index", { error: null });
});

// Proses cari mahasiswa
app.post("/cari", (req, res) => {
  const nim = req.body.nim;
  const sql = "SELECT * FROM data_mahasiswa WHERE nim = ?";
  db.query(sql, [nim], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      res.render("index", { error: "Mahasiswa tidak ditemukan!" });
    } else {
      res.render("detail", { mahasiswa: results[0] });
    }
  });
});

// Lihat semua mahasiswa
app.get("/list", (req, res) => {
  db.query("SELECT * FROM data_mahasiswa", (err, results) => {
    if (err) throw err;
    res.render("list", { data: results });
  });
});

// Form tambah mahasiswa
app.get("/tambah", (req, res) => {
  res.render("tambah");
});

// Proses tambah mahasiswa
app.post("/tambah", upload.single("foto"), (req, res) => {
  try {
    const { nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
      INSERT INTO data_mahasiswa (foto, nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [foto, nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk], err => {
      if (err) throw err;
      console.log(`✅ Data mahasiswa ${nama_lengkap} berhasil ditambahkan`);
      res.redirect("/list");
    });
  } catch (error) {
    console.error("❌ Gagal menambahkan mahasiswa:", error.message);
    res.status(500).send("Terjadi kesalahan saat menambah data");
  }
});

// Form edit mahasiswa
app.get("/edit/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM data_mahasiswa WHERE id = ?", [id], (err, results) => {
    if (err) throw err;
    if (!results.length) return res.status(404).send("Data tidak ditemukan");
    res.render("edit", { mahasiswa: results[0] });
  });
});

// Detail mahasiswa berdasarkan ID
app.get("/detail/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM data_mahasiswa WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(404).send("Mahasiswa tidak ditemukan");
    }
    res.render("detail", { mahasiswa: results[0] });
  });
});

// Proses update mahasiswa (bisa upload ulang foto)
app.post("/update/:id", upload.single("foto"), (req, res) => {
  const id = req.params.id;
  const { nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk } = req.body;

  let sql, params;

  if (req.file) {
    const foto = `/uploads/${req.file.filename}`;
    sql = `
      UPDATE data_mahasiswa 
      SET foto=?, nama_lengkap=?, nim=?, fakultas=?, jurusan=?, prodi=?, tahun_masuk=? 
      WHERE id=?
    `;
    params = [foto, nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk, id];
  } else {
    sql = `
      UPDATE data_mahasiswa 
      SET nama_lengkap=?, nim=?, fakultas=?, jurusan=?, prodi=?, tahun_masuk=? 
      WHERE id=?
    `;
    params = [nama_lengkap, nim, fakultas, jurusan, prodi, tahun_masuk, id];
  }

  db.query(sql, params, err => {
    if (err) throw err;
    console.log(`✏️ Data mahasiswa ${nama_lengkap} berhasil diperbarui`);
    res.redirect("/list");
  });
});

// Hapus mahasiswa
app.get("/hapus/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM data_mahasiswa WHERE id = ?", [id], err => {
    if (err) throw err;
    console.log(`🗑️ Data mahasiswa ID ${id} berhasil dihapus`);
    res.redirect("/list");
  });
});

// -----------------------------
// ✅ Jalankan server
// -----------------------------
app.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});
