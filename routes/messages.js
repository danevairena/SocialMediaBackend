const express = require('express');
const router = express.Router();
const MessagesController = require('../controllers/MessagesController');
const authenticateToken = require('../middleware/auth');

// GET /api/messages/conversations - all chats
router.get('/conversations', (req, res, next) => {
  next();
}, authenticateToken, MessagesController.getConversations);

// GET /api/messages/:userId - history with one user
router.get('/:userId', authenticateToken, MessagesController.getConversationHistory);

// GET /api/messages/unread-count
router.get('/unread-count', authenticateToken, MessagesController.getUnreadCount);

// POST /api/messages - sending message
router.post('/', authenticateToken, MessagesController.sendMessage);

// PUT /api/messages/seen/:userId - mark as read
router.put('/seen/:userId', authenticateToken, MessagesController.markAsSeen);

module.exports = router;
