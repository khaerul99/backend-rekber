// src/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib'); // Import Library
const qrcode = require('qrcode');
const { generateToken } = require('../utils/jwt');

const prisma = new PrismaClient();

// REGISTER
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // --- 1. VALIDASI PASSWORD (LOGIKA BARU) ---
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough || !hasUpperCase || !hasSpecialChar) {
      return res.status(400).json({ 
        message: 'Password harus minimal 8 karakter, memiliki 1 huruf besar, dan 1 karakter unik (simbol).' 
      });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'Email sudah terdaftar' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      token: user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password, twofaToken } = req.body; 

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'User tidak ditemukan' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Password salah' });

    // --- CEK APAKAH USER MENGAKTIFKAN 2FA? ---
    if (user.twofa_enabled) {
        // Jika token 2FA belum dikirim dari frontend
        if (!twofaToken) {
            return res.json({ 
                message: '2FA Required', 
                require2FA: true // Frontend akan membaca flag ini lalu memunculkan popup input OTP
            });
        }

        // Jika token dikirim, verifikasi dulu
        const isValid = authenticator.check(twofaToken, user.twofa_secret);
        if (!isValid) return res.status(400).json({ message: 'Kode 2FA Salah' });
    }

    // Jika lolos semua, baru kasih Token JWT
    res.json({
      message: 'Login berhasil',
      id: user.id,          
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generate2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Buat secret key unik untuk user ini
    const secret = authenticator.generateSecret();

    // Simpan secret ke DB (tapi set enabled = false dulu)
    await prisma.user.update({
      where: { id: userId },
      data: { twofa_secret: secret }
    });

    // Buat format URL otpauth (agar bisa dibaca Google Authenticator)
    // Format: otpauth://totp/NamaApp:EmailUser?secret=...&issuer=NamaApp
    const otpauth = authenticator.keyuri(user.email, 'RekberApp', secret);

    // Generate QR Code gambar (Data URL)
    const imageUrl = await qrcode.toDataURL(otpauth);

    res.json({
      message: 'Scan QR Code ini di aplikasi Google Authenticator',
      qrCode: imageUrl, // Frontend akan menampilkan ini sebagai gambar <img src="..." />
      secret: secret    // Opsional: tampilkan text jika kamera user rusak
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. VERIFY: User memasukkan kode 6 digit untuk mengaktifkan
// src/controllers/authController.js

exports.verify2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    console.log("--- DEBUG 2FA START ---");
    console.log("1. User ID:", userId);
    console.log("2. Token Input:", token);

    // Cari User
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
        console.log("User tidak ditemukan di DB");
        return res.status(404).json({ message: "User not found" });
    }

    console.log("3. Secret di DB:", user.twofa_secret);

    // Validasi
    const isValid = authenticator.check(token, user.twofa_secret);
    console.log("4. Hasil Cek:", isValid ? "COCOK" : "TIDAK COCOK");

    if (!isValid) {
      return res.status(400).json({ message: 'Kode OTP salah/kadaluarsa' });
    }

    // Update
    await prisma.user.update({
      where: { id: userId },
      data: { twofa_enabled: true }
    });

    console.log("5. Sukses Update DB");
    res.json({ message: '2FA Berhasil Diaktifkan!' });

  } catch (error) {
    console.error("ERROR DI VERIFY 2FA:", error); // Cek terminal VS Code kalau error 500
    res.status(500).json({ error: error.message });
  }
};

// 3. VALIDATE PIN & 2FA (Middleware/Helper untuk Transaksi Penting)
// Fungsi ini nanti dipanggil di route pencairan dana / login
exports.validateSecurity = async (req, res, next) => {
    const { pin, token } = req.body;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 1. Cek PIN (Jika user sudah set PIN)
    if (user.pin) {
        if(!pin) return res.status(400).json({ message: 'PIN wajib diisi' });
        const isPinMatch = await bcrypt.compare(pin, user.pin); // Asumsi PIN di-hash
        if (!isPinMatch) return res.status(400).json({ message: 'PIN Salah' });
    }

    // 2. Cek Google Auth (Jika user sudah aktifkan 2FA)
    if (user.twofa_enabled) {
        if(!token) return res.status(400).json({ message: 'Kode 2FA wajib diisi' });
        const isValid = authenticator.check(token, user.twofa_secret);
        if (!isValid) return res.status(400).json({ message: 'Kode 2FA Salah' });
    }

    next(); // Lanjut ke fungsi berikutnya (misal: Withdrawal)
};