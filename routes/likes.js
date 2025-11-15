const express = require('express');
const router = express.Router();
const LikeController = require('../controllers/LikesController');

// GET /api/likes/:postId
router.get('/:postId', LikeController.getLikesByPostId);

// POST /api/likes
router.post('/', LikeController.likePost);

// DELETE /api/likes
router.delete('/', LikeController.unlikePost);

module.exports = router;
