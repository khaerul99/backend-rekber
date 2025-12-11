// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import semua file route pecahan
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const transactionRoutes = require('./transactionRoutes');
const settingRoutes = require('./settingRoutes')
const reviewRoutes = require('./reviewRoutes')
const nofification = require('./notificationRoutes')

const dashboardController = require('../controllers/dashboardController');
const {protect} = require ('../middlewares/authMiddleware')

// Gabungkan semuanya di sini
router.use('/auth', authRoutes);               
router.use('/users', userRoutes);              
router.use('/transactions', transactionRoutes);
router.use('/settings', settingRoutes)
router.get('/admin/stats', protect, dashboardController.getAdminStats);
router.get('/admin/chart', protect, dashboardController.getChartData);
router.get('/user/stats', protect, dashboardController.getUserStats);
router.use('/reviews', reviewRoutes);
router.use('/notifications', nofification)


module.exports = router;