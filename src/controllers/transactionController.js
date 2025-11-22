// src/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// transaction user
exports.createTransaction = async (req, res) => {
  try {
    const { sellerEmail, amount, description } = req.body;
    const buyerId = req.user.id; 

    // 1. Cari Penjual
    const seller = await prisma.user.findUnique({ where: { email: sellerEmail } });
    if (!seller) return res.status(404).json({ message: 'Penjual tidak ditemukan' });

    let adminFee = 5000; 
    
    const feeSetting = await prisma.systemSetting.findUnique({
        where: { key: 'admin_fee' }
    });

    if (feeSetting) {
        adminFee = parseFloat(feeSetting.value);
    }

    

    const totalTransfer = parseFloat(amount) + adminFee;
    const trxCode = `TRX-${Date.now()}`; 

    const newTrx = await prisma.transaction.create({
      data: {
        trx_code: trxCode,
        amount: amount,
        admin_fee: adminFee,
        description:description,
        total_transfer: totalTransfer,
        buyerId: buyerId,
        sellerId: seller.id,
        status: 'PENDING_PAYMENT'
      }
    });

    res.status(201).json({ 
      message: 'Transaksi berhasil dibuat', 
      data: newTrx 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload Bukti (User)
exports.uploadProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const file = req.file;

    // 1. Cek apakah file masuk?
    console.log("--- DEBUG UPLOAD ---");
    console.log("ID Transaksi:", id);
    console.log("Tipe:", type);
    console.log("File:", file ? file.filename : "KOSONG");

    if (!file) return res.status(400).json({ message: 'File tidak ditemukan' });

    // 2. SIMPAN KE DATABASE (Ini yang tadi gagal)
    try {
      const savedProof = await prisma.transactionProof.create({
        data: {
          transactionId: id,
          type: type,
          imageUrl: `/uploads/${file.filename}`
        }
      });
      console.log("✅ SUKSES SIMPAN PROOF:", savedProof);
    } catch (dbError) {
      console.error("❌ GAGAL SIMPAN PROOF KE DB:", dbError);
      return res.status(500).json({ error: "Gagal menyimpan ke database: " + dbError.message });
    }

    // 3. Update Status Transaksi
    if (type === 'payment_proof') {
      await prisma.transaction.update({
        where: { id: id },
        data: { status: 'VERIFYING' }
      });
      console.log("✅ STATUS UPDATED: VERIFYING");
    }

    res.json({ 
      message: 'Bukti berhasil diupload', 
      filePath: `/uploads/${file.filename}` 
    });

  } catch (error) {
    console.error("ERROR UTAMA:", error);
    res.status(500).json({ error: error.message });
  }
};

// Konfirmasi Kirim Barang (Penjual)
exports.markAsSent = async (req, res) => {
  const { id } = req.params;
  
  // Set waktu otomatis selesai: Sekarang + 48 Jam (2 Hari)
  const autoDate = new Date();
  autoDate.setHours(autoDate.getHours() + 48); 

  await prisma.transaction.update({
    where: { id: id },
    data: {
      status: 'SENT',
      auto_complete_at: autoDate // Set timer
    }
  });

  res.json({ message: 'Status diubah menjadi DIKIRIM. Timer 2x24 jam dimulai.' });
};

// List Transaksi Saya (Dashboard User)
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        buyer: { select: { username: true, email: true } },
        seller: { select: { username: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    // Cek apakah Admin
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const transactions = await prisma.transaction.findMany({
      include: {
        buyer: { select: { username: true, email: true } },
        seller: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' } // Yang terbaru paling atas
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Detail Transaksi (User & Admin)
exports.getTransactionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id: id }, 
      include: {
          buyer: { select: { id: true, username: true, email: true } },
        seller: { select: { id: true, username: true, email: true } },

        chats: {
          orderBy: { createdAt: 'asc' }, 
          include: { 
             sender: { select: { username: true, id: true, role: true } } 
          }
        },
       
        proofs: true 
      }
    });

    if (!transaction) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    // Security Check: Pastikan yang lihat cuma Pembeli, Penjual, atau Admin
    if (transaction.buyerId !== userId && transaction.sellerId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    res.json(transaction);
  } catch (error) {
          console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Cek Transaksi Publik (Tanpa Login)
exports.trackTransaction = async (req, res) => {
  try {
    const { trx_code } = req.params; // misal: TRX-17123456

    const transaction = await prisma.transaction.findUnique({
      where: { trx_code: trx_code },
      select: {
        trx_code: true,
        status: true,
        total_transfer: true,
        createdAt: true,
        // Jangan tampilkan data sensitif user lain
      }
    });

    if (!transaction) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Alasan komplain
    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({ where: { id } });


    if (transaction.buyerId !== userId) {
        return res.status(403).json({ message: "Hanya pembeli yang bisa mengajukan komplain." });
    }

    
    if (transaction.status !== 'SENT') {
        return res.status(400).json({ message: "Komplain hanya bisa diajukan setelah barang dikirim." });
    }

    await prisma.transaction.update({
      where: { id },
      data: { 
        status: 'DISPUTED',
       
      }
    });

    await prisma.chat.create({
      data: {
        transactionId: id,
        senderId: userId,
        message: `[SISTEM] Komplain Diajukan: "${reason}"`,
        is_read: false
      }
    });

    res.json({ message: 'Komplain berhasil diajukan. Admin akan segera menengahi.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- FITUR ADMIN

// VALIDASI PEMBAYARAN (Admin Dashboard)
exports.adminVerifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Pastikan yang akses adalah ADMIN
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Hanya Admin yang bisa memvalidasi' });
    }

    const updatedTrx = await prisma.transaction.update({
      where: { id: id },
      data: {
        status: 'PROCESSED' // Ubah status jadi PROCESSED
      }
    });

    res.json({ message: 'Pembayaran valid. Penjual sekarang bisa kirim barang.', data: updatedTrx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
//  Konfirmasi Selesai
exports.markAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({ where: { id } });

    // Pastikan hanya Pembeli yang bisa klik
    if (transaction.buyerId !== userId) {
        return res.status(403).json({ message: "Hanya pembeli yang bisa menyelesaikan pesanan." });
    }

    await prisma.transaction.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    res.json({ message: 'Transaksi selesai. Dana siap dicairkan ke penjual.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PENCAIRAN DANA (Admin Dashboard)
exports.adminDisburse = async (req, res) => {
  try {
    const { id } = req.params; 

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Hanya Admin!' });
    }

    const trx = await prisma.transaction.findUnique({ where: { id: id } });
    if (trx.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Transaksi belum selesai, dana belum bisa dicairkan.' });
    }

   
    const seller = await prisma.user.findUnique({ where: { id: trx.sellerId } });

    res.json({
      message: 'Silakan transfer manual ke rekening berikut, lalu konfirmasi.',
      bank_info: {
        bank: seller.bank_name,
        rek: seller.bank_account,
        an: seller.bank_holder,
        nominal: trx.amount 
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// mengambil daftar antrian (Status: VERIFYING)
exports.getVerifyingTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const transactions = await prisma.transaction.findMany({
      where: { status: 'VERIFYING' }, // Hanya ambil yang sedang menunggu dicek
      include: {
        buyer: { select: { username: true, email: true } },
        proofs: true 
      },
      orderBy: { updatedAt: 'asc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Menolak Pembayaran (Reject)
exports.adminRejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    // Kembalikan status ke PENDING (Suruh upload ulang)
    const updatedTrx = await prisma.transaction.update({
      where: { id: id },
      data: { status: 'PENDING_PAYMENT' }
    });

    res.json({ message: 'Pembayaran ditolak.', data: updatedTrx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Daftar yang Siap Cair
exports.getReadyToDisburse = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const transactions = await prisma.transaction.findMany({
      where: { status: 'COMPLETED' }, // Hanya ambil yang sudah selesai tapi belum cair
      include: {
        seller: { 
          select: { 
            username: true, 
            email: true,
            bank_name: true,
            bank_account: true,
            bank_holder: true
          } 
        }
      },
      orderBy: { updatedAt: 'asc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tandai Sudah Cair
exports.markAsDisbursed = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    await prisma.transaction.update({
      where: { id },
      data: { status: 'DISBURSED' }
    });

    res.json({ message: 'Dana berhasil ditandai cair.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDisputedTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const transactions = await prisma.transaction.findMany({
      where: { status: 'DISPUTED' },
      include: {
        buyer: { select: { username: true, email: true } },
        seller: { select: { username: true, email: true } },
      },
      orderBy: { updatedAt: 'asc' }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Putusan Admin (Refund atau Lanjut)
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'REFUND_BUYER' atau 'RELEASE_SELLER'

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    let newStatus = '';
    
    if (decision === 'REFUND_BUYER') {
        // Uang dikembalikan ke pembeli -> Transaksi Batal
        newStatus = 'CANCELLED';
    } else if (decision === 'RELEASE_SELLER') {
        // Komplain ditolak, uang diteruskan ke penjual -> Masuk antrian Pencairan
        newStatus = 'COMPLETED';
    } else {
        return res.status(400).json({ message: 'Keputusan tidak valid' });
    }

    await prisma.transaction.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({ message: `Sengketa diselesaikan. Status: ${newStatus}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};