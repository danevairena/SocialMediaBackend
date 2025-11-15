const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const PostController = require('../controllers/PostController');

const uploadDir = path.join(__dirname, '../uploads/posts');

// Multer configuration - for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/posts
router.get('/', PostController.getAllPosts);

// GET /api/posts/:id
router.get('/:id', PostController.getPostById);

// GET /api/posts/user/:userId
router.get('/user/:userId', PostController.getPostsByUserId);

// POST /api/posts (with optional image upload)
router.post('/', upload.single('image'), PostController.createPost);

// PUT /api/posts/:id
router.put('/:id', upload.single('image'), PostController.updatePost);

// DELETE /api/posts/:id
router.delete('/:id', PostController.deletePost);

module.exports = router;
