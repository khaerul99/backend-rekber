const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const review = require('../controllers/reviewController');



router.post('/', protect, review.createReview); 
router.get('/public', review.getLatestReviews);



module.exports = router;