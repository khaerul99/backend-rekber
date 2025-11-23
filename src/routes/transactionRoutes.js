// src/routes/transactionRoutes.js
const express = require("express");
const {
  createTransaction,
  markAsSent,
  markAsCompleted,
  uploadProof,
  getMyTransactions,
  getTransactionDetail,
  adminVerifyPayment,
  trackTransaction,
  getVerifyingTransactions,
  adminRejectPayment,
  getAllTransactions,
  getReadyToDisburse, 
  markAsDisbursed,
  getDisputedTransactions, 
  resolveDispute,
  createDispute, 
  getRefundQueue,
  markAsRefunded
} = require("../controllers/transactionController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Route User
router.post("/", protect, createTransaction);
router.get('/admin/all', protect, getAllTransactions);
router.get("/my-transactions", protect, getMyTransactions);

// ambil detail transaksi
router.get("/:id", protect, getTransactionDetail);

// Route Upload
router.post("/:id/upload-proof", protect, upload.single("image"), uploadProof);

// Route Action User
router.patch("/:id/sent", protect, markAsSent);
router.patch('/:id/complete', protect, markAsCompleted);
router.patch('/:id/dispute', protect, createDispute);

// verifikasi admin
router.get("/admin/verifying", protect, getVerifyingTransactions);

// Route Admin (Khusus Validasi)
router.patch("/:id/verify", protect, adminVerifyPayment);
router.patch("/:id/reject", protect, adminRejectPayment);


// ROUTE PENCAIRAN
router.get('/admin/disbursement', protect, getReadyToDisburse);
router.patch('/:id/disburse', protect, upload.single('image'), markAsDisbursed);

// ROUTE DISPUTE
router.get('/admin/disputes', protect, getDisputedTransactions);
router.post('/admin/disputes/:id/resolve', protect, resolveDispute);

// REFUND
router.get('/admin/refunds', protect, getRefundQueue);
router.patch('/:id/refund', protect, upload.single('image'), markAsRefunded);

// traking
router.get("/track/:trx_code", trackTransaction);



module.exports = router;
