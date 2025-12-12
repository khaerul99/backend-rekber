const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, 
    secure: true, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // 2. Opsi Email
  const mailOptions = {
    from: `"Rekber App Support" <${process.env.EMAIL_USER}>`, 
    to: options.email, 
    subject: options.subject,
    html: options.message 
  };

  // 3. Kirim
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;