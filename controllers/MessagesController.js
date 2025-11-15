const db = require('../models/db');

class MessagesController {
  // GET /api/messages/:userId - history with one user
  getConversationHistory(req, res) {
    const loggedInUser = req.user.id;
    const otherUserId = req.params.userId;

    const sql = `
      SELECT m.ID, m.SenderID, m.ReceiverID, m.Content, m.Seen, m.CreatedAt,
             u.Username AS SenderName, u.ProfilePicture AS SenderPic
      FROM Messages m
      JOIN Users u ON m.SenderID = u.ID
      WHERE (m.SenderID = ? AND m.ReceiverID = ?)
         OR (m.SenderID = ? AND m.ReceiverID = ?)
      ORDER BY m.CreatedAt ASC
    `;

    db.query(sql, [loggedInUser, otherUserId, otherUserId, loggedInUser], (err, results) => {
      if (err) {
        console.error('Error fetching conversation:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const messages = results.map(msg => ({
        id: msg.ID,
        senderId: msg.SenderID,
        receiverId: msg.ReceiverID,
        content: msg.Content,
        seen: !!msg.Seen,
        createdAt: msg.CreatedAt,
        senderName: msg.SenderName,
        senderPic: msg.SenderPic
          ? `http://localhost:3001/uploads/profile_pics/${msg.SenderPic}`
          : '/default-avatar.png',
      }));

      res.json(messages);
    });
  }

  // GET /api/messages/unread-count
  getUnreadCount(req, res) {
    const userId = req.user.id;
    const sql = `SELECT COUNT(*) AS count FROM Messages WHERE ReceiverID = ? AND Seen = 0`;
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ count: results[0].count });
    });
  }

  // GET /api/messages/conversations - all chats
  getConversations(req, res) {
    const userId = req.user.id;

    const sql = `
      SELECT 
        u.ID AS userId, 
        u.Username, 
        u.ProfilePicture,
        mLast.Content AS lastMessage,
        SUM(CASE WHEN m.ReceiverID = ? AND m.Seen = 0 THEN 1 ELSE 0 END) AS unreadCount
      FROM Messages m
      JOIN Users u ON u.ID = CASE 
        WHEN m.SenderID = ? THEN m.ReceiverID
        ELSE m.SenderID
      END
      LEFT JOIN Messages mLast ON mLast.ID = (
        SELECT ID FROM Messages
        WHERE (SenderID = u.ID AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = u.ID)
        ORDER BY CreatedAt DESC
        LIMIT 1
      )
      WHERE m.SenderID = ? OR m.ReceiverID = ?
      GROUP BY u.ID, u.Username, u.ProfilePicture, mLast.Content
      ORDER BY MAX(m.CreatedAt) DESC
    `;

    db.query(
      sql,
      [userId, userId, userId, userId, userId, userId],
      (err, results) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const convs = results.map((r) => ({
          userId: r.userId,
          username: r.Username,
          profilePic: r.ProfilePicture
            ? `http://localhost:3001/uploads/profile_pics/${r.ProfilePicture}`
            : "/avatars/default-profile-icon.png",
          lastMessage: r.lastMessage,
          unreadCount: r.unreadCount,
        }));

        res.json(convs);
      }
    );
  }

  // POST /api/messages - sending message
  sendMessage(req, res) {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Missing receiverId or content' });
    }

    const sql = `INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)`;
    db.query(sql, [senderId, receiverId, content], (err, result) => {
      if (err) {
        console.error('Error sending message:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const message = {
        id: result.insertId,
        senderId,
        receiverId,
        content,
        seen: false,
        createdAt: new Date(),
      };

      res.status(201).json(message);
    });
  }

  // PUT /api/messages/seen/:userId - mark as read
  markAsSeen(req, res) {
    const loggedInUser = req.user.id;
    const otherUserId = req.params.userId;

    const sql = `
      UPDATE Messages
      SET Seen = TRUE
      WHERE ReceiverID = ? AND SenderID = ? AND Seen = FALSE
    `;

    db.query(sql, [loggedInUser, otherUserId], (err, result) => {
      if (err) {
        console.error('Error updating seen status:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ success: true, updated: result.affectedRows });
    });
  }
}

module.exports = new MessagesController();
