const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Buat transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // smtp.zoho.com
    port: Number(process.env.EMAIL_PORT), // Pastikan jadi angka
    secure: process.env.EMAIL_PORT == 465, // True jika 465, False jika 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Tambahan logger untuk cek error di Railway
    logger: true,
    debug: true
  });

  const mailOptions = {
    from: `"Rekber App" <${process.env.EMAIL_USER}>`, 
    to: options.email, 
    subject: options.subject,
    html: options.message 
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;