const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sendEmail = require('./sendEmail');

// Fungsi Reusable untuk Kirim Notifikasi
const notifyUser = async ({ userId, role, title, message, emailSubject }) => {
  try {
    let targets = [];

    // SKENARIO 1: Kirim ke User Tertentu (Personal)
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) targets.push(user);
    } 
    // SKENARIO 2: Kirim ke Role Tertentu (Broadcast Admin)
    else if (role) {
      const users = await prisma.user.findMany({ where: { role: role } });
      targets = users;
    }

    if (targets.length === 0) return;

    // Loop untuk kirim ke semua target
    for (const user of targets) {
        // 1. Simpan ke Database (Untuk Lonceng)
        await prisma.notification.create({
            data: {
                userId: user.id,
                title,
                message
            }
        });

        // 2. Kirim Email (Jika subject diisi)
        if (emailSubject) {
            const emailContent = `
                <h3>Halo ${user.username},</h3>
                <p>${message}</p>
                <hr/>
                <p>Silakan cek dashboard admin untuk menindaklanjuti.</p>
            `;
            
            // Fire and forget email
            sendEmail({
                email: user.email,
                subject: emailSubject,
                message: emailContent
            }).catch(err => console.error(`Gagal kirim email ke ${user.email}:`, err.message));
        }
    }

  } catch (error) {
    console.error("Notification Error:", error);
  }
};

module.exports = notifyUser;