// src/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Update Data Bank & Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bank_name, bank_account, bank_holder } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bank_name,     // Contoh: "BCA"
        bank_account,  // Contoh: "1234567890"
        bank_holder    // Contoh: "Ahmad Rivaldi"
      }
    });

    res.json({ message: 'Data rekening berhasil disimpan', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Profile Sendiri
exports.getMyProfile = async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(user);
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      // PENTING: Gunakan select agar password & pin tidak ikut terkirim
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bank_name: true,    
        bank_account: true,
        createdAt: true
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params; 

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        username: true,
        email: true, 
        role: true,
        bank_name: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek otorisasi: Hanya Admin
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    // Mencegah Admin menghapus dirinya sendiri
    if (id === req.user.id) {
        return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    // Menangani error jika user masih punya transaksi aktif (Foreign Key constraint)
    res.status(500).json({ 
        message: 'Gagal menghapus. User mungkin memiliki data transaksi aktif.' 
    });
  }
};