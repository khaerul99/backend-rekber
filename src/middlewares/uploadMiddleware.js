const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir); 
  },
  filename: (req, file, cb) => {
    // Format nama file: TRXID-TIMESTAMP.jpg
    cb(null, `PROOF-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Filter file (Hanya gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya boleh upload gambar!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Maksimal 2MB
});

module.exports = upload;
