// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import semua file route pecahan
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const transactionRoutes = require('./transactionRoutes');
const settingRoutes = require('./settingRoutes')

const dashboardController = require('../controllers/dashboardController');
const {protect} = require ('../middlewares/authMiddleware')

// Gabungkan semuanya di sini
router.use('/auth', authRoutes);               // URL jadi: /api/auth/...
router.use('/users', userRoutes);              // URL jadi: /api/users/...
router.use('/transactions', transactionRoutes);// URL jadi: /api/transactions/...
router.use('/settings', settingRoutes)
router.get('/admin/stats', protect, dashboardController.getAdminStats);
router.get('/admin/chart', protect, dashboardController.getChartData);
router.get('/user/stats', protect, dashboardController.getUserStats);

module.exports = router;