// const nodemailer = require('nodemailer');

// const sendEmail = async (options) => {
// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST, // Host khusus Brevo
//     port: Number(process.env.EMAIL_PORT), // Port standar Brevo
//     secure: false, // Wajib false untuk port 587
//     auth: {
//       user: process.env.EMAIL_USER, // Email login Brevo kamu
//       pass: process.env.EMAIL_PASS  // Password SMTP dari Langkah 1
//     }
//   })

//   const mailOptions = {
//     from: `"Rekber App" <${process.env.EMAIL_USER}>`, 
//     to: options.email, 
//     subject: options.subject,
//     html: options.message 
//   };

//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;


// src/utils/sendEmail.js

const sendEmail = async (options) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER;

  if (!apiKey || !senderEmail) {
    throw new Error("BREVO_API_KEY or EMAIL_USER is missing in environment variables");
  }

  // URL API Brevo
  const url = "https://api.brevo.com/v3/smtp/email";

  // Data yang dikirim
  const payload = {
    sender: { email: senderEmail, name: "Rekber App Support" },
    to: [{ email: options.email }],
    subject: options.subject,
    htmlContent: options.message
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Brevo API Error Detail:", errorData);
      throw new Error(`Gagal kirim email via Brevo API: ${JSON.stringify(errorData)}`);
    }

    console.log("✅ Email Berhasil Terkirim via Brevo API!");

  } catch (error) {
    console.error("❌ Error System:", error);
    throw error;
  }
};

module.exports = sendEmail;