const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Buat Review (Khusus Pembeli)
exports.createReview = async (req, res) => {
  try {
    const { transactionId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // 1. Cek Transaksi
    const trx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    
    if (!trx) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    if (trx.buyerId !== reviewerId) return res.status(403).json({ message: "Hanya pembeli yang bisa review" });
    
    if (!['COMPLETED', 'DISBURSED'].includes(trx.status)) {
        return res.status(400).json({ message: "Transaksi belum selesai" });
    }

    // --- 2. CEK DUPLIKASI (TAMBAHAN PENTING) ---
    const existingReview = await prisma.review.findUnique({
        where: { transactionId: transactionId }
    });

    if (existingReview) {
        return res.status(400).json({ message: "Anda sudah memberikan ulasan sebelumnya." });
    }
    // -------------------------------------------

    // 3. Create Review
    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment,
        transactionId,
        reviewerId,
        targetId: trx.sellerId
      }
    });

    res.json({ message: "Ulasan berhasil dikirim", data: review });
  } catch (error) {
    console.error("Error Review:", error); // Cek terminal untuk lihat error aslinya
    res.status(500).json({ error: error.message });
  }
};

// 2. Ambil Review Terbaru (Untuk Landing Page - Public)
exports.getLatestReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      take: 6, // Ambil 6 ulasan terbaru
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { username: true } } // Ambil nama pembeli
      }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};