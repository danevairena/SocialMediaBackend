const db = require('../models/db');

class FollowController {
  // GET /api/follow/followers/:userId
  getFollowers(req, res) {
    const userId = req.params.userId;

    const sql = `
      SELECT FollowerID, Users.Username, Users.ProfilePicture
      FROM Followers
      JOIN Users ON Followers.FollowerID = Users.ID
      WHERE FollowingID = ?
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching followers:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(results);
    });
  }

  // GET /api/follow/following/:userId
  getFollowing(req, res) {
    const userId = req.params.userId;
    const sql = `
      SELECT Users.ID AS FollowingID, Users.Username, Users.ProfilePicture
      FROM Followers
      JOIN Users ON Followers.FollowingID = Users.ID
      WHERE Followers.FollowerID = ?
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    });
  }

  // GET /api/follow/status?followerId=123&followingId=456
  getFollowStatus(req, res) {
    const followerId = parseInt(req.query.followerId, 10);
    const followingId = parseInt(req.query.followingId, 10);

    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Invalid followerId or followingId' });
    }

    const sql = `
      SELECT 1 FROM Followers
      WHERE FollowerID = ? AND FollowingID = ?
      LIMIT 1
    `;

    db.query(sql, [followerId, followingId], (err, results) => {
      if (err) {
        console.error('Error checking follow status:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ isFollowing: results.length > 0 });
    });
  }

  // POST /api/follow/follow
  followUser(req, res) {
    const { followerId, followingId } = req.body;

    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Missing followerId or followingId' });
    }

    const sql = 'INSERT INTO Followers (FollowerID, FollowingID) VALUES (?, ?)';

    db.query(sql, [followerId, followingId], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Already following this user' });
        }
        console.error('Error following user:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Create Notification
      if (followerId !== followingId) {
        const notifSql = `
          INSERT INTO Notifications (ReceiverID, SenderID, Type)
          VALUES (?, ?, 'follow')
        `;
        db.query(notifSql, [followingId, followerId]);
      }

      res.status(201).json({ message: 'Now following user' });
    });
  }

  // POST /api/follow/unfollow
  unfollowUser(req, res) {
    const { followerId, followingId } = req.body;

    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Missing followerId or followingId' });
    }

    const sql = 'DELETE FROM Followers WHERE FollowerID = ? AND FollowingID = ?';

    db.query(sql, [followerId, followingId], (err, result) => {
      if (err) {
        console.error('Error unfollowing user:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Not following this user' });
      }

      res.json({ message: 'Unfollowed user' });
    });
  }
}

module.exports = new FollowController();
