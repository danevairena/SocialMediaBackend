const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/CommentController');

// GET all comments for a post
router.get('/:postId', CommentController.getCommentsByPostId);

// POST a new comment
router.post('/', CommentController.createComment);

// DELETE a comment
router.delete('/:id', CommentController.deleteComment);

module.exports = router;
