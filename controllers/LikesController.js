const db = require('../models/db');

class LikeController {
  // GET /api/likes/:postId
  getLikesByPostId(req, res) {
    const postId = req.params.postId;

    const sql = `
      SELECT Likes.UserID, Users.Username, Users.ProfilePicture
      FROM Likes
      JOIN Users ON Likes.UserID = Users.ID
      WHERE Likes.PostID = ?
    `;

    db.query(sql, [postId], (err, results) => {
      if (err) {
        console.error('Error fetching likes:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const likes = results.map(user => ({
        ...user,
        ProfilePicture: user.ProfilePicture
          ? `http://localhost:3001/uploads/profile_pics/${user.ProfilePicture}`
          : '/default-avatar.png',
      }));

      res.json(likes);
    });
  }

  // POST /api/likes
  likePost(req, res) {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: 'Missing postId or userId' });
    }

    const sql = 'INSERT INTO Likes (PostID, UserID) VALUES (?, ?)';

    db.query(sql, [postId, userId], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Post already liked by this user' });
        }
        console.error('Error liking post:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Create Notification
      const getAuthorSql = 'SELECT UserID FROM Posts WHERE ID = ?';
      db.query(getAuthorSql, [postId], (err, rows) => {
        if (!err && rows.length > 0) {
          const receiverId = rows[0].UserID;
          if (receiverId !== userId) {
            const notifSql = `
              INSERT INTO Notifications (ReceiverID, SenderID, Type, PostID)
              VALUES (?, ?, 'like', ?)
            `;
            db.query(notifSql, [receiverId, userId, postId]);
          }
        }
      });

      res.status(201).json({ success: true, message: 'Post liked' });
    });
  }

  // DELETE /api/likes
  unlikePost(req, res) {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: 'Missing postId or userId' });
    }

    const sql = 'DELETE FROM Likes WHERE PostID = ? AND UserID = ?';

    db.query(sql, [postId, userId], (err, result) => {
      if (err) {
        console.error('Error unliking post:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Like not found' });
      }

      res.json({ success: true, message: 'Like removed' });
    });
  }
}

module.exports = new LikeController();