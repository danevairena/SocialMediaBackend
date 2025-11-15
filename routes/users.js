const express = require('express');
const router  = express.Router();
const UserController = require('../controllers/UserController');
const upload = require('../middleware/upload');
const authenticateToken = require('../middleware/auth');

// GET /api/users
router.get('/', authenticateToken, UserController.getAllUsers);

// GET /api/users/username/:username - public access
router.get('/username/:username', UserController.getUserByUsername);

// GET /api/users/check-username/:username - public
router.get('/check-username/:username', UserController.checkUsername);

// GET /api/users/profile (logged-in user)
router.get('/profile', authenticateToken, UserController.getCurrentUser);

// GET /api/users/:id
router.get('/:id', authenticateToken, UserController.getUserById);

// POST /api/users - register
router.post('/', upload.single('profilePicture'), UserController.createUser);

// POST /api/users/login
router.post('/login', UserController.loginUser);

// PUT /api/users/change-password
router.put('/change-password', authenticateToken, UserController.changePassword);

// PUT /api/users/:id
router.put('/:id', authenticateToken, upload.single('profilePicture'), UserController.updateUser);

// DELETE /api/users/:id
router.delete('/:id', authenticateToken, UserController.deleteUser);

module.exports = router;
