// src/routes/userRoutes.js
const express = require('express');
const { updateProfile, getMyProfile, getAllUsers, getUserById, deleteUser, changePassword } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/update', protect, updateProfile);
router.delete('/:id', protect, deleteUser);
router.put('/change-password', protect, changePassword);

router.get('/', protect, getAllUsers); 
router.get('/:id', protect, getUserById);





module.exports = router;