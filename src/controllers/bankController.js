const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// 1. Ambil Semua Bank
exports.getAdminBanks = async (req, res) => {
  try {
    const banks = await prisma.adminBankAccount.findMany({
        orderBy: { createdAt: 'asc' }
    });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Tambah Bank Baru
exports.addAdminBank = async (req, res) => {
  try {
    const { bankName, bankNumber, bankHolder } = req.body;
    const file = req.file;

    const newBank = await prisma.adminBankAccount.create({
      data: {
        bankName,
        bankNumber,
        bankHolder,
        logoUrl: file ? `/uploads/${file.filename}` : null
      }
    });

    res.json(newBank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Bank
exports.updateAdminBank = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, bankNumber, bankHolder } = req.body;
    const file = req.file;

    const dataToUpdate = { bankName, bankNumber, bankHolder };
    
    if (file) {
      dataToUpdate.logoUrl = `/uploads/${file.filename}`;
    }

    const updatedBank = await prisma.adminBankAccount.update({
      where: { id },
      data: dataToUpdate
    });

    res.json(updatedBank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Hapus Bank
exports.deleteAdminBank = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.adminBankAccount.delete({ where: { id } });
    res.json({ message: "Bank dihapus" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};