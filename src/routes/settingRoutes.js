const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {getPaymentSettings, updatePaymentSettings} = require ('../controllers/settingController')



// ... route auth, users, transactions ...

// --- ROUTE ADMIN BANK (BARU) ---
router.get('/admin-banks', bankController.getAdminBanks); 
router.post('/admin-banks', protect, upload.single('logo'), bankController.addAdminBank);
router.put('/admin-banks/:id', protect, upload.single('logo'), bankController.updateAdminBank);
router.delete('/admin-banks/:id', protect, bankController.deleteAdminBank);

// --- ROUTE SETTING (Hanya untuk Fee) ---
router.get('/payment', getPaymentSettings); 
router.put('/payment', protect, updatePaymentSettings);

module.exports = router;