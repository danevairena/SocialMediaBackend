const db = require('../models/db');

class NotificationsController {
  // GET /api/notifications/user/:userId
  getNotificationsByUser(req, res) {
    const userId = req.params.userId;

    const sql = `
      SELECT 
        N.ID,
        N.Type,
        N.PostID,
        N.IsRead,
        N.CreatedAt AS timestamp,
        U.ID AS senderId,
        U.Username AS senderUsername,
        U.ProfilePicture AS senderAvatar,
        P.Content AS postContent
      FROM Notifications N
      LEFT JOIN Users U ON N.SenderID = U.ID
      LEFT JOIN Posts P ON N.PostID = P.ID
      WHERE N.ReceiverID = ?
      ORDER BY N.CreatedAt DESC
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const notifications = results.map(n => ({
        id: n.ID,
        type: n.Type,
        postId: n.PostID,
        isRead: !!n.IsRead,
        timestamp: n.timestamp,
        fromUser: n.senderId
          ? {
              id: n.senderId,
              username: n.senderUsername || 'Unknown',
              avatar: n.senderAvatar
                ? `http://localhost:3001/uploads/profile_pics/${n.senderAvatar}`
                : 'http://localhost:3001/avatars/default-profile-icon.png'
            }
          : null,
        message:
          n.Type === 'like'
            ? 'liked your post'
            : n.Type === 'comment'
            ? 'commented on your post'
            : n.Type === 'follow'
            ? 'started following you'
            : ''
      }));

      res.json(notifications);
    });
  }

  // POST /api/notifications
  createNotification(req, res) {
    const { receiverId, senderId, type, postId } = req.body;
    if (!receiverId || !type) return res.status(400).json({ error: 'receiverId and type required' });

    const sql = `
      INSERT INTO Notifications (ReceiverID, SenderID, Type, PostID)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [receiverId, senderId || null, type, postId || null], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({
        id: result.insertId,
        receiverId,
        senderId,
        type,
        postId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
  }

  // PUT /api/notifications/user/:userId/read
  markAllAsRead(req, res) {
    const userId = req.params.userId;
    const sql = `UPDATE Notifications SET IsRead = TRUE WHERE ReceiverID = ?`;

    db.query(sql, [userId], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'All notifications marked as read', affectedRows: result.affectedRows });
    });
  }
}

module.exports = new NotificationsController();
