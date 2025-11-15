const db = require('../models/db');
const fs = require('fs');
const path = require('path');

class PostController {
  // GET /api/posts OR /api/posts?userId=123
  getAllPosts(req, res) {
    const { userIds, userId } = req.query;
    let sql = `
      SELECT 
        Posts.ID,
        Posts.Content AS Text,
        Posts.ImageURL AS Image,
        Posts.CreatedAt,
        Users.Username,
        Users.ProfilePicture,
        COUNT(DISTINCT Likes.ID) AS Likes,
        EXISTS(
          SELECT 1 
          FROM Likes 
          WHERE Likes.PostID = Posts.ID AND Likes.UserID = ?
        ) AS isLiked
      FROM Posts
      JOIN Users ON Posts.UserID = Users.ID
      LEFT JOIN Likes ON Likes.PostID = Posts.ID
    `;

    let params = [userId || 0];

    if (userIds) {
      const ids = userIds.split(',').map(id => parseInt(id));
      sql += ` WHERE Posts.UserID IN (${ids.map(() => '?').join(',')})`;
      params = [userId || 0, ...ids];
    }

    sql += ` GROUP BY Posts.ID ORDER BY Posts.CreatedAt DESC`;

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Error fetching posts:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const postsWithComments = results.map(post => ({
        ...post,
        isLiked: !!post.isLiked,
        comments: []
      }));

      res.json(postsWithComments);
    });
  }

  getPostById(req, res) {
    const postId = req.params.id;
    const { userId } = req.query;

    const sql = `
      SELECT 
        Posts.ID,
        Posts.Content AS Text,
        Posts.ImageURL AS Image,
        Posts.CreatedAt,
        Users.Username,
        Users.ProfilePicture,
        COUNT(DISTINCT Likes.ID) AS Likes,
        EXISTS(
          SELECT 1 
          FROM Likes 
          WHERE Likes.PostID = Posts.ID AND Likes.UserID = ?
        ) AS isLiked
      FROM Posts
      JOIN Users ON Posts.UserID = Users.ID
      LEFT JOIN Likes ON Likes.PostID = Posts.ID
      WHERE Posts.ID = ?
      GROUP BY Posts.ID
    `;

    db.query(sql, [userId || 0, postId], (err, results) => {
      if (err) {
        console.error('Error fetching post:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const post = results[0];
      post.isLiked = !!post.isLiked;
      res.json(post);
    });
  }

  getPostsByUserId(req, res) {
    const userId = req.params.userId;
    const currentUserId = parseInt(req.query.currentUserId) || 0;

    const sql = `
      SELECT 
        Posts.ID,
        Posts.Content AS Text,
        Posts.ImageURL AS Image,
        Posts.CreatedAt,
        Users.Username,
        Users.ProfilePicture,
        COUNT(DISTINCT Likes.ID) AS Likes,
        EXISTS(
          SELECT 1 
          FROM Likes 
          WHERE Likes.PostID = Posts.ID AND Likes.UserID = ?
        ) AS isLiked
      FROM Posts
      JOIN Users ON Posts.UserID = Users.ID
      LEFT JOIN Likes ON Likes.PostID = Posts.ID
      WHERE Posts.UserID = ?
      GROUP BY Posts.ID
      ORDER BY Posts.CreatedAt DESC
    `;

    db.query(sql, [currentUserId, userId], (err, results) => {
      if (err) {
        console.error('Error fetching posts by user:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const postsWithLikes = results.map(post => ({
        ...post,
        isLiked: !!post.isLiked,
      }));

      res.json(postsWithLikes);
    });
  }

  createPost(req, res) {
    const { UserID, Text } = req.body;
    const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

    const userId = parseInt(UserID, 10);
    if (!userId || ((!Text || Text.trim() === '') && !imageUrl)) {
      return res.status(400).json({ error: 'Post must have text or image and a valid UserID.' });
    }

    const sql = `INSERT INTO Posts (UserID, Content, ImageURL) VALUES (?, ?, ?)`;
    db.query(sql, [userId, Text || null, imageUrl], (err, result) => {
      if (err) {
        console.error('Error creating post:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'Post created successfully', postId: result.insertId });
    });
  }

  updatePost(req, res) {
    const postId = req.params.id;
    const { content, imageUrl } = req.body;

    db.query('SELECT ImageURL FROM Posts WHERE ID = ?', [postId], (err, results) => {
      if (err) {
        console.error('Error fetching post:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const oldImageUrl = results[0].ImageURL;

      const sql = `UPDATE Posts SET Content = ?, ImageURL = ? WHERE ID = ?`;
      db.query(sql, [content || null, imageUrl || null, postId], (err, result) => {
        if (err) {
          console.error('Error updating post:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (oldImageUrl && oldImageUrl !== imageUrl) {
          const filePath = path.join(__dirname, '..', 'uploads', 'posts', path.basename(oldImageUrl));
          fs.unlink(filePath, (fsErr) => {
            if (fsErr) console.error('Error deleting old image file:', fsErr);
          });
        }

        res.json({ message: 'Post updated' });
      });
    });
  }

  deletePost(req, res) {
    const postId = req.params.id;

    db.query('SELECT ImageURL FROM Posts WHERE ID = ?', [postId], (err, results) => {
      if (err) {
        console.error('Error fetching post:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const imageUrl = results[0].ImageURL;

      db.query('DELETE FROM Posts WHERE ID = ?', [postId], (err, result) => {
        if (err) {
          console.error('Error deleting post:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // delete image from the server
        if (imageUrl) {
          const filePath = path.join(__dirname, '..', 'uploads', 'posts', path.basename(imageUrl));
          fs.unlink(filePath, (fsErr) => {
            if (fsErr) console.error('Error deleting image file:', fsErr);
          });
        }

        res.json({ message: 'Post deleted successfully' });
      });
    });
  }
}

module.exports = new PostController();
