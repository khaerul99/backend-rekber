const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    // Total User
    const totalUsers = await prisma.user.count({ where: { role: 'MEMBER' } });

    // Transaksi Perlu Verifikasi
    const pendingVerification = await prisma.transaction.count({ where: { status: 'VERIFYING' } });

    // Total Transaksi Sukses
    const successTransactions = await prisma.transaction.count({ where: { status: 'COMPLETED' } });

    // Hitung Total Fee (Keuntungan)
   
    const totalFee = await prisma.transaction.aggregate({
      _sum: { admin_fee: true },
      where: { status: { in: ['COMPLETED', 'DISBURSED'] } } // Hitung yang sudah selesai/cair
    });

    // Hitung Total Uang Masuk
    const totalVolume = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: { not: 'CANCELLED' } } // Semua kecuali batal
    });

    const activeHolding = await prisma.transaction.aggregate({
      _sum: { amount: true }, // Nominal murni penjual
      where: { 
        status: { in: ['PROCESSED', 'SENT', 'COMPLETED'] } 
      }
    });

  res.json({
      totalUsers,
      pendingVerification,
      successTransactions,
      totalRevenue: totalFee._sum.admin_fee || 0,
      totalVolume: totalVolume._sum.amount || 0,     
      activeHolding: activeHolding._sum.amount || 0  
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChartData = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Ambil transaksi 7 hari terakhir
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        status: true,
        amount: true
      }
    });

    // --- LOGIKA PENGELOMPOKAN DATA ---
    // Kita buat array kosong untuk 7 hari ke belakang
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Format Label (misal: "Senin", "22 Nov")
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' }); 
      
      chartData.push({
        date: dateString,
        name: dayName,
        total: 0,
        success: 0
      });
    }

    // Isi data dari database ke array chartData
    transactions.forEach(trx => {
      const trxDate = trx.createdAt.toISOString().split('T')[0];
      
      // Cari hari yang cocok di array chartData
      const dayIndex = chartData.findIndex(d => d.date === trxDate);
      
      if (dayIndex !== -1) {
        chartData[dayIndex].total += 1; // Tambah jumlah transaksi
        if (trx.status === 'COMPLETED') {
          chartData[dayIndex].success += 1; // Tambah transaksi sukses
        }
      }
    });

    res.json(chartData);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    //  Hitung Total Pengeluaran (Sebagai Pembeli)
    const totalSpent = await prisma.transaction.aggregate({
      _sum: { total_transfer: true },
      where: { 
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    // Hitung Total Pemasukan (Sebagai Penjual)
    const totalEarned = await prisma.transaction.aggregate({
      _sum: { amount: true }, // Nominal bersih tanpa fee
      where: { 
        sellerId: userId,
        status: { in: ['COMPLETED', 'DISBURSED'] }
      }
    });

    // Hitung Transaksi Aktif (Sedang Berjalan)
    const activeTransactions = await prisma.transaction.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: ['PENDING_PAYMENT', 'VERIFYING', 'PROCESSED', 'SENT', 'DISPUTED'] }
      }
    });

    res.json({
      totalSpent: totalSpent._sum.total_transfer || 0,
      totalEarned: totalEarned._sum.amount || 0,
      activeTransactions
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};