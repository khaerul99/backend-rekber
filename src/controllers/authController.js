// src/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib'); // Import Library
const qrcode = require('qrcode');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto'); 
const sendEmail = require('../utils/sendEmail');
const { verifyAccountTemplate, resetPasswordTemplate } = require('../utils/emailTemplates');
require('dotenv').config();

const prisma = new PrismaClient();

// REGISTER
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // --- 1. VALIDASI PASSWORD (LOGIKA BARU) ---
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough || !hasUpperCase || !hasSpecialChar) {
      return res.status(400).json({ 
        message: 'Password harus minimal 8 karakter, memiliki 1 huruf besar, dan 1 karakter unik (simbol).' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password dan Konfirmasi Password tidak cocok!" });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'Email sudah terdaftar' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isVerified: false,
        verificationToken: verificationToken,
      },
    });

    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;

    const message = verifyAccountTemplate(username, verifyUrl); 

    // Kirim Email
    await sendEmail({
      email: user.email,
      subject: 'Verifikasi Akun Rekber',
      message 
    });

    res.status(201).json({
      message: 'Registrasi berhasil! Silahkan cek email Anda untuk verifikasi akun',
      token: user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body; // Token dikirim dari frontend

    // 1. Cari user yang punya token ini
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ message: "Token verifikasi tidak valid atau kedaluwarsa." });
    }

    // 2. Update User jadi Aktif
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null // Hapus token biar gak bisa dipake ulang
      }
    });

    res.status(200).json({ message: "Email berhasil diverifikasi! Silahkan login." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal verifikasi email." });
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

    if (!user.isVerified) {
    return res.status(401).json({ message: "Email Anda belum diverifikasi. Silahkan cek inbox email Anda." });
  }

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


exports.verify2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Validasi
    const isValid = authenticator.check(token, user.twofa_secret);

    if (!isValid) {
      return res.status(400).json({ message: 'Kode OTP salah/kadaluarsa' });
    }

    // Update
    await prisma.user.update({
      where: { id: userId },
      data: { twofa_enabled: true }
    });

    res.json({ message: '2FA Berhasil Diaktifkan!' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Email tidak terdaftar" });
    }

    // 1. Generate Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Simpan ke DB (Expired 1 Jam)
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) 
      }
    });

    // 3. Kirim Email
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;
    
  const messageHtml = resetPasswordTemplate(resetUrl);

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset Password - Rekber App',
        message: messageHtml,
      });
      res.json({ message: "Email terkirim! Cek inbox Anda." });
    } catch (err) {
      
      await prisma.user.update({
        where: { email },
        data: { resetPasswordToken: null, resetPasswordExpires: null }
      });
      return res.status(500).json({ message: "Gagal mengirim email", error: err.message });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
   
     if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password dan Konfirmasi Password tidak cocok!" });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough || !hasUpperCase || !hasSpecialChar) {
      return res.status(400).json({ 
        message: 'Password baru harus minimal 8 karakter, memiliki 1 huruf besar, dan 1 simbol.' 
      });
    }


    // 1. Cari User & Cek Token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() } 
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Token tidak valid atau sudah kadaluarsa" });
    }


    // 2. Hash Password Baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Update & Bersihkan Token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    res.json({ message: "Password berhasil diubah! Silakan login." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};