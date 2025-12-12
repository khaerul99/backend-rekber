const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Buat transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Otomatis mengatur Host=smtp.gmail.com dan Port=465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
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