const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",  // Langsung tulis string
    port: 587,              // Langsung tulis angka
    secure: false,          // WAJIB False untuk port 587
    auth: {
      user: "62-8953018517112@zohomail.com", 
      pass: "9tcMTc01KA2z" 
    },
    logger: true,
    debug: true
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