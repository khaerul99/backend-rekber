// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Konfigurasi penyimpanan
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = "uploads/";
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir);
//     }
//     cb(null, dir); 
//   },
//   filename: (req, file, cb) => {
//     // Format nama file: TRXID-TIMESTAMP.jpg
//     cb(null, `PROOF-${Date.now()}${path.extname(file.originalname)}`);
//   },
// });

// // Filter file (Hanya gambar)
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Hanya boleh upload gambar!"), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 5 }, // Maksimal 2MB
// });

// module.exports = upload;


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config(); // PENTING: Untuk baca .env

// 1. Konfigurasi Cloudinary (Baca dari .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Konfigurasi Penyimpanan (Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rekber-proofs',       // Nama folder nanti di dashboard Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'], // Filter hanya gambar
    public_id: (req, file) => {
      // Opsional: Custom nama file. Kalau dihapus, Cloudinary kasih nama acak.
      // Format: PROOF-[timestamp]
      return `PROOF-${Date.now()}`; 
    }
  },
});

// 3. Inisialisasi Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB (Sesuai kodingan kamu tadi)
});

module.exports = upload;