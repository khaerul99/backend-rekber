// src/routes/userRoutes.js
const express = require('express');
const { updateProfile, getMyProfile, getAllUsers, getUserById, deleteUser, changePassword, setupPin, verifyPin } = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.get('/', protect, admin, getAllUsers); 
router.get('/:id', protect, admin, getUserById);
router.put('/update', protect, updateProfile);
router.delete('/:id', protect, admin, deleteUser);
router.put('/change-password', protect, changePassword);
router.put('/pin', protect, setupPin);
router.post('/pin/verify', protect, verifyPin);







module.exports = router;