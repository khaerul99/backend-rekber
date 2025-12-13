// src/utils/emailTemplates.js

// 1. Template Dasar (Wadah Utama) agar desain konsisten
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background-color: #2563eb; padding: 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; color: #333333; line-height: 1.6; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .footer { background-color: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #666666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rekber App</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Rekber App. All rights reserved.</p>
      <p>Aplikasi Rekening Bersama Terpercaya.</p>
    </div>
  </div>
</body>
</html>
`;


exports.transactionNotificationTemplate = (title, message, link) => {
  const content = `
    <h2>${title}</h2>
    <p>${message}</p>
    <div class="button-container">
      <a href="${link}" class="button">Lihat Detail Transaksi</a>
    </div>
    <p>Atau klik link ini: <a href="${link}">${link}</a></p>
  `;
  return baseTemplate(content);
};

// 2. Template Verifikasi Email (Register)
exports.verifyAccountTemplate = (username, verifyUrl) => {
  const content = `
    <h2>Halo, ${username}! 👋</h2>
    <p>Terima kasih telah mendaftar di Rekber App. Untuk mulai bertransaksi dengan aman, mohon verifikasi alamat email Anda.</p>
    <div class="button-container">
      <a href="${verifyUrl}" class="button" style="word-break: break-all; color: #ffffff;">Verifikasi Akun Saya</a>
    </div>
    <p>Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:</p>
    <p style="word-break: break-all; color: #2563eb;">${verifyUrl}</p>
    <p>Link ini berlaku selama 24 jam.</p>
  `;
  return baseTemplate(content);
};

// 3. Template Reset Password (Lupa Password)
exports.resetPasswordTemplate = (url) => {
  const content = `
    <h2>Permintaan Reset Password 🔒</h2>
    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Jika ini bukan Anda, abaikan email ini.</p>
    <div class="button-container">
      <a href="${url}" class="button" style="font-size: 12px; color: #ffffff;">Buat Password Baru</a>
    </div>
    <p>Demi keamanan, link ini hanya berlaku selama <strong>1 jam</strong>.</p>
    <p style="font-size: 12px; color: #888;">Jika Anda tidak merasa meminta reset password, akun Anda tetap aman.</p>
  `;
  return baseTemplate(content);
};