
const express = require("express");
const notificationController = require('../controllers/notificationController');
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();


router.get('/', protect, notificationController.getMyNotifications);
router.patch('/read', protect, notificationController.markRead);


module.exports = router;