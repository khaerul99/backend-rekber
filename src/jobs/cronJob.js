// src/jobs/cronJob.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkAutoCompletion = async (req, res) => {
  try {
    const now = new Date();

    // 1. Cari transaksi status 'SENT' yang waktunya sudah lewat
    const expiredTransactions = await prisma.transaction.findMany({
      where: {
        status: 'SENT',
        auto_complete_at: {
          lte: now, 
        },
      },
    });

    if (expiredTransactions.length > 0) {
      // 2. Loop dan update status menjadi COMPLETED
      for (const trx of expiredTransactions) {
        await prisma.transaction.update({
          where: { id: trx.id },
          data: {
            status: 'COMPLETED',
            updatedAt: now,
          },
        });
        
        // TODO: Tambahkan logika untuk menambah saldo ke dompet penjual di sini
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
    
  }
};

module.exports = { checkAutoCompletion };