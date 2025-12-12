const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // Host khusus Brevo
    port: 587, // Port standar Brevo
    secure: false, // Wajib false untuk port 587
    auth: {
      user: process.env.EMAIL_USER, // Email login Brevo kamu
      pass: process.env.EMAIL_PASS  // Password SMTP dari Langkah 1
    }
  })

  const mailOptions = {
    from: `"Rekber App" <${process.env.EMAIL_USER}>`, 
    to: options.email, 
    subject: options.subject,
    html: options.message 
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;