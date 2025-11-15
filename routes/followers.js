const express = require('express');
const router = express.Router();
const FollowController = require('../controllers/FollowController');

// Followers & Following
router.get('/followers/:userId', FollowController.getFollowers);
router.get('/following/:userId', FollowController.getFollowing);

// Follow / Unfollow
router.post('/follow', FollowController.followUser);
router.post('/unfollow', FollowController.unfollowUser);

// Follow status check
router.get('/status', FollowController.getFollowStatus);

module.exports = router;
