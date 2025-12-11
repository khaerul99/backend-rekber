const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Konfigurasi Transporter (Zoho)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // smtp.zoho.com
    port: process.env.EMAIL_PORT, // 465
    secure: true, // true untuk port 465 (SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // 2. Opsi Email
  const mailOptions = {
    from: `"Rekber App Support" <${process.env.EMAIL_USER}>`, 
    to: options.email, // Penerima
    subject: options.subject,
    html: options.message 
  };

  // 3. Kirim
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;