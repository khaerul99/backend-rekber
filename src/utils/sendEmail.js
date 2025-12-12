const { Resend } = require('resend');

// Inisialisasi Resend dengan API Key dari Environment Variable
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    // Kirim email menggunakan API Resend
    const data = await resend.emails.send({
      // PENTING: Jika belum punya domain sendiri di Resend,
      // WAJIB pakai 'onboarding@resend.dev' sebagai pengirim.
      from: 'Rekber App <onboarding@resend.dev>', 
      
      // Ke siapa email dikirim
      to: options.email, 
      
      subject: options.subject,
      html: options.message
    });

    console.log("✅ Email Terkirim via Resend:", data);
  } catch (error) {
    console.error("❌ Gagal Kirim Email via Resend:", error);
    throw error; // Lempar error agar ditangkap oleh controller
  }
};

module.exports = sendEmail;