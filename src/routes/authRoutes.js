const express = require("express");
const {
  register,
  login,
  generate2FA,
  verify2FA,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// --- ROUTE 2FA BARU ---
// User harus login dulu (ada token JWT) untuk bisa setup 2FA
router.post("/2fa/setup", protect, generate2FA);
router.post("/2fa/verify", protect, verify2FA);

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
