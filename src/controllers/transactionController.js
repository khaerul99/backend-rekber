// src/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notifyUser = require('../utils/notify');


// transaction user
exports.createTransaction = async (req, res) => {
  try {
    const { sellerEmail, amount, description } = req.body;
    const buyerId = req.user.id; 

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

    await notifyUser({
        userId: seller.id,
        title: "Pesanan Baru Masuk!",
        message: `Anda menerima pesanan baru senilai Rp ${amount}. Segera cek!`,
        link: `/dashboard/transaction/${newTrx.id}`,
        withEmail: true
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
    } catch (dbError) {
      return res.status(500).json({ error: "Gagal menyimpan ke database: " + dbError.message });
    }

    // 3. Update Status Transaksi
    if (type === 'payment_proof') {
     const trx =  await prisma.transaction.update({
        where: { id: id },
        data: { status: 'VERIFYING' },
        select: {trx_code:true}
      });

      const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });


      await notifyUser({
          role: 'ADMIN', 
          title: "Pembayaran Perlu Verifikasi",
          message: `Ada transaksi baru dari user ${currentUser.username} dengan id ${trx.trx_code} yang menunggu verifikasi pembayaran.`,
          emailSubject: "🔔 Action Required: Verifikasi Pembayaran Baru"
      });
    }



    res.json({ 
      message: 'Bukti berhasil diupload', 
      filePath: `/uploads/${file.filename}` 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Konfirmasi Kirim Barang (Penjual)
exports.markAsSent = async (req, res) => {
  const { id } = req.params;
  const { trackingNumber } = req.body;
  
  // Set waktu otomatis selesai: Sekarang + 48 Jam (2 Hari)
  const autoDate = new Date();
  autoDate.setHours(autoDate.getHours() + 48); 

  await prisma.transaction.update({
    where: { id: id },
    data: {
      status: 'SENT',
      auto_complete_at: autoDate, 
      resiString: trackingNumber
    }
  });

  if (trackingNumber) {
        await prisma.chat.create({
            data: {
                transactionId: id,
                senderId: req.user.id,
                message: `[SISTEM] Pesanan dikirim. Info/Resi: ${trackingNumber}`,
                is_read: false
            }
        });
    }

  const trx = await prisma.transaction.findUnique({ where: { id } });

    await notifyUser({
        userId: trx.buyerId,
        title: "Barang Sedang Dikirim",
        message: "Penjual telah mengirim pesanan. Cek resi di detail transaksi.",
        link: `/dashboard/transaction/${trx.id}`,
        withEmail: true
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
       
        proofs: true ,
        review: true
      }
    });

    if (!transaction) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    // Security Check: Pastikan yang lihat cuma Pembeli, Penjual, atau Admin
    if (transaction.buyerId !== userId && transaction.sellerId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    
    res.json(transaction);
  } catch (error) {
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

     const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

    await notifyUser({
        role: 'ADMIN',
        title: "Sengketa Baru Diajukan",
        message: `Pembeli username ${currentUser.username} mengajukan komplain pada transaksi ${transaction.trx_code}. Harap segera cek Pusat Resolusi.`,
        emailSubject: "🚨 Alert: Sengketa Baru Masuk"
    });

    await notifyUser({
        userId: transaction.sellerId, 
        title: "Sengketa Diajukan Pembeli",
        message: `Pembeli ${currentUser.username} mengajukan komplain pada transaksi ini ${transaction.trx_code}. Mohon cek detailnya di aplikasi.`,
        emailSubject: "🚨 Info: Pembeli Mengajukan Komplain"
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
        status: 'PROCESSED' 
      }
    });

    const trx = await prisma.transaction.findUnique({ where: { id: id } }); 
    
    await notifyUser({
        userId: trx.sellerId,
        title: "Pembayaran Terverifikasi",
        message: "Dana sudah aman. Silakan kirim barang sekarang.",
        emailSubject: "Info: Pembayaran Valid - Segera Kirim Barang"
    });

    await notifyUser({
        userId: trx.buyerId,
        title: "Pembayaran Diterima",
        message: "Pembayaran Anda valid. Menunggu penjual mengirim barang.",
        emailSubject: "Info: Pembayaran Berhasil Diverifikasi"
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

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

     await notifyUser({
        userId: transaction.sellerId, 
        title: "Transaksi Selesai",
        message: `Pembeli ${currentUser.username} telah menerima barang. Dana akan segera dicairkan Admin.`,
        emailSubject: "Hore! Barang Sudah Diterima Pembeli"
    });

    await notifyUser({
        role: 'ADMIN', 
        title: "Dana Siap Dicairkan",
        message: `Transaksi ${transaction.trx_code} selesai. Dana Rp ${Number(transaction.amount).toLocaleString()} siap ditransfer ke Penjual.`,
        emailSubject: "💰 Action Required: Cairkan Dana Penjual"
    });

    res.json({ message: 'Transaksi selesai. Dana siap dicairkan ke penjual.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tandai Sudah Cair + Upload Bukti
exports.markAsDisbursed = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file; 

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    
    
    if (!file) return res.status(400).json({ message: 'Bukti transfer wajib diupload' });

    
    await prisma.transactionProof.create({
      data: {
        transactionId: id,
        type: 'admin_transfer_proof', 
        imageUrl: `/uploads/${file.filename}`
      }
    });

   

   
    const trx = await prisma.transaction.update({
      where: { id },
      data: { status: 'DISBURSED' }
    });

   

    await notifyUser({
        userId: trx.sellerId,
        title: "Dana Telah Dicairkan!",
        message: "Admin telah mentransfer dana ke rekening Anda. Cek mutasi.",
        emailSubject: "Info: Pencairan dana selesai"
    });

    res.json({ message: 'Dana berhasil dicairkan.' });
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

// Menolak Pembayaran (Reject)
exports.adminRejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    // Kembalikan status ke PENDING (Suruh upload ulang)
    const updatedTrx = await prisma.transaction.update({
      where: { id: id },
      data: { status: 'PENDING_PAYMENT' }
    });

    await notifyUser({
        userId: updatedTrx.buyerId,
        title: "Pembayaran Ditolak",
        message: "Bukti pembayaran Anda tidak valid. Silakan upload ulang.",
        emailSubject: "Alert: Pembayaran Ditolak"
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


exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; 

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    let newStatus = '';
    
    if (decision === 'REFUND_BUYER') {
        newStatus = 'REFUND_PENDING';
    } else if (decision === 'RELEASE_SELLER') {
        newStatus = 'COMPLETED';
    } else if (decision === 'RETURN_GOODS') { 
        newStatus = 'RETURN_PROCESS';
        message = '[SISTEM] Admin memutuskan: Retur Barang disetujui. Pembeli harap segera kirim balik barang.';
    } else {
        return res.status(400).json({ message: 'Keputusan tidak valid' });
    }

    await prisma.transaction.update({
      where: { id },
      data: { status: newStatus }
    });

    await prisma.chat.create({
        data: {
          transactionId: id,
          senderId: req.user.id,
          message: message,
          is_read: false
        }
    });

    res.json({ message: `Sengketa diselesaikan. Status: ${newStatus}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ...

// 3. Ambil Daftar Refund (REFUND_PENDING)
exports.getRefundQueue = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const transactions = await prisma.transaction.findMany({
      where: { status: 'REFUND_PENDING' },
      include: {
        // Kita butuh data Pembeli (karena uang balik ke pembeli)
        buyer: { 
          select: { 
            username: true, email: true, 
            bank_name: true, bank_account: true, bank_holder: true 
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

// 4. Eksekusi Refund (Tandai REFUNDED + Upload Bukti)
exports.markAsRefunded = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    if (!file) return res.status(400).json({ message: 'Bukti refund wajib diupload' });

    await prisma.transactionProof.create({
      data: {
        transactionId: id,
        type: 'admin_refund_proof', // Tipe khusus refund
        imageUrl: `/uploads/${file.filename}`
      }
    });

    await prisma.transaction.update({
      where: { id },
      data: { status: 'REFUNDED' }
    });

    await prisma.chat.create({
      data: {
        transactionId: id,
        senderId: req.user.id,
        message: '[SISTEM] Dana telah dikembalikan (Refund) ke Pembeli.',
        is_read: false
      }
    });

    res.json({ message: 'Refund berhasil.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.buyerReturnGoods = async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body; 
        const file = req.file; 


        if (file) {
            await prisma.transactionProof.create({
                data: {
                    transactionId: id,
                    type: 'return_shipping_proof',
                    imageUrl: `/uploads/${file.filename}`
                }
            });
        }

      
        await prisma.transaction.update({
            where: { id },
            data: { status: 'RETURN_SENT' } 
        });

        await prisma.chat.create({
            data: {
              transactionId: id,
              senderId: req.user.id,
              message: `[SISTEM] Barang telah dikirim balik. Ket: ${description}`,
              is_read: false
            }
        });

        res.json({ message: 'Status diupdate: Barang dikirim balik.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.sellerConfirmReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const trx = await prisma.transaction.findUnique({ where: { id } });
        if (trx.sellerId !== userId) return res.status(403).json({ message: "Akses ditolak" });

        await prisma.transaction.update({
            where: { id },
            data: { status: 'REFUND_PENDING' }
        });

        await prisma.chat.create({
            data: {
              transactionId: id,
              senderId: userId,
              message: '[SISTEM] Penjual telah menerima barang retur. Dana siap dikembalikan ke Pembeli.',
              is_read: false
            }
        });

        await notifyUser({
        role: 'ADMIN',
        title: "Barang Retur Diterima",
        message: `Penjual telah menerima barang retur (${id}). Segera proses Refund ke Pembeli.`,
        emailSubject: "💸 Info: Refund Siap Diproses"
    });

        res.json({ message: 'Konfirmasi berhasil. Menunggu Admin refund dana.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};