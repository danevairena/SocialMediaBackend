const db = require('../models/db');
const BASE_URL = "http://localhost:3001";

class CommentController {
  // GET /api/comments/:postId
  getCommentsByPostId(req, res) {
    const postId = req.params.postId;

    const sql = `
      SELECT Comments.ID, Comments.Text, Comments.CreatedAt,
             Users.Username, Users.ProfilePicture
      FROM Comments
      JOIN Users ON Comments.UserID = Users.ID
      WHERE Comments.PostID = ?
      ORDER BY Comments.CreatedAt ASC
    `;

    db.query(sql, [postId], (err, results) => {
      if (err) {
        console.error('Error fetching comments:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const formattedComments = results.map(c => ({
        ID: c.ID,
        Text: c.Text,
        CreatedAt: c.CreatedAt,
        username: c.Username,
        avatar: c.ProfilePicture
          ? `${BASE_URL}/uploads/profile_pics/${c.ProfilePicture}`
          : '/avatars/default-profile-icon.png'
      }));

      res.json(formattedComments);
    });
  }

  // POST /api/comments
  createComment(req, res) {
    const { postId, userId, text } = req.body;

    if (!postId || !userId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO Comments (PostID, UserID, Text) VALUES (?, ?, ?)`;

    db.query(sql, [postId, userId, text], (err, result) => {
      if (err) {
        console.error('Error creating comment:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const getUserSql = 'SELECT Username, ProfilePicture FROM Users WHERE ID = ?';
      db.query(getUserSql, [userId], (err, rows) => {
        if (err || rows.length === 0) {
          return res.status(500).json({ error: 'Error fetching user info' });
        }

        const user = rows[0];
        const avatar = user.ProfilePicture
          ? `${BASE_URL}/uploads/profile_pics/${user.ProfilePicture}`
          : '/avatars/default-profile-icon.png';

        const newComment = {
          ID: result.insertId,
          Text: text,
          CreatedAt: new Date().toISOString(),
          username: user.Username,
          avatar
        };

        // Create notification
        const getAuthorSql = 'SELECT UserID FROM Posts WHERE ID = ?';
        db.query(getAuthorSql, [postId], (err, authorRows) => {
          if (!err && authorRows.length > 0) {
            const receiverId = authorRows[0].UserID;
            if (receiverId !== userId) {
              const notifSql = `
                INSERT INTO Notifications (ReceiverID, SenderID, Type, PostID)
                VALUES (?, ?, 'comment', ?)
              `;
              db.query(notifSql, [receiverId, userId, postId]);
            }
          }
        });

        res.status(201).json(newComment);
      });
    });
  }

  // DELETE /api/comments/:id
  deleteComment(req, res) {
    const commentId = req.params.id;

    const sql = 'DELETE FROM Comments WHERE ID = ?';

    db.query(sql, [commentId], (err, result) => {
      if (err) {
        console.error('Error deleting comment:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      res.json({ message: 'Comment deleted' });
    });
  }
}

module.exports = new CommentController();
