// src/controllers/settingController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


exports.getPaymentSettings = async (req, res) => {
  try {
    // Hanya ambil setting admin_fee
    const feeSetting = await prisma.systemSetting.findUnique({
      where: { key: 'admin_fee' }
    });

    res.json({
      // Jika belum disetting, default "0"
      admin_fee: feeSetting ? feeSetting.value : "0"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updatePaymentSettings = async (req, res) => {
  try {
    // Cek apakah user adalah ADMIN
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Hanya Admin yang boleh mengubah ini' });
    }

    const { admin_fee } = req.body;

    if (admin_fee) {
      // Upsert: Update jika ada, Create jika belum ada
      await prisma.systemSetting.upsert({
        where: { key: 'admin_fee' },
        update: { value: String(admin_fee) },
        create: { key: 'admin_fee', value: String(admin_fee) }
      });
    }

    res.json({ message: 'Biaya layanan berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};