const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

class UserController {
  // GET /api/users
  getAllUsers(req, res) {
    db.query(
      'SELECT ID, Username, Email, Bio, ProfilePicture, CreatedAt FROM Users',
      (err, results) => {
        if (err) {
          console.error('Error fetching users:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
      }
    );
  }

  //GET /api/users/check-username/:username
  checkUsername(req, res) {
    const username = req.params.username;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ available: false, message: 'Invalid username' });
    }

    db.query(
      'SELECT ID FROM Users WHERE Username = ?',
      [username],
      (err, results) => {
        if (err) {
          console.error('Error checking username:', err);
          return res.status(500).json({ available: false, message: 'Database error' });
        }

        if (results.length > 0) {
          return res.json({ available: false, message: 'Username is taken' });
        }

        return res.json({ available: true, message: 'Username is available' });
      }
    );
  }

  // GET /api/users/username/:username
  getUserByUsername(req, res) {
    const username = req.params.username;

    db.query(
      'SELECT ID, Username, Email, FirstName, LastName, Bio, ProfilePicture, CreatedAt FROM Users WHERE Username = ?',
      [username],
      (err, userResults) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = userResults[0];

        const sqlPosts = `
          SELECT 
            Posts.ID,
            Posts.Content AS Text,
            Posts.ImageURL AS Image,
            Posts.CreatedAt,
            COUNT(Likes.ID) AS Likes
          FROM Posts
          LEFT JOIN Likes ON Likes.PostID = Posts.ID
          WHERE Posts.UserID = ?
          GROUP BY Posts.ID
          ORDER BY Posts.CreatedAt DESC
        `;

        db.query(sqlPosts, [user.ID], (err, postResults) => {
          if (err) return res.status(500).json({ error: 'Error fetching posts' });

          const posts = postResults.map(post => ({
            ID: post.ID,
            Text: post.Text,
            Image: post.Image,
            Likes: post.Likes,
            CreatedAt: post.CreatedAt,
            comments: [],
            isLiked: false,
          }));

          res.json({ ...user, posts });
        });
      }
    );
  }

  // GET /api/users/:id
  getUserById(req, res) {
    const userId = req.params.id;

    db.query(
      'SELECT ID, Username, Email, FirstName, LastName, Bio, ProfilePicture, CreatedAt FROM Users WHERE ID = ?',
      [userId],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
      }
    );
  }

  // GET /api/users/profile (logged-in user)
  getCurrentUser(req, res) {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: Missing user data' });
    }

    const userId = req.user.id;

    db.query(
      `SELECT ID, Username, Email, FirstName, LastName, Bio, ProfilePicture, CreatedAt 
      FROM Users 
      WHERE ID = ?`,
      [userId],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
      }
    );
  }

  // POST /api/users - register
  createUser(req, res) {
    const { username, email, password, bio, firstName, lastName } = req.body;
    const profilePicture = req.file ? req.file.filename : null;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    if (!email.includes('@') || !email.includes('.')) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long' });

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: 'Hashing error' });

      const sql = `
        INSERT INTO Users (Username, Email, Password, Bio, ProfilePicture, FirstName, LastName)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(sql, [username, email, hashedPassword, bio || null, profilePicture, firstName, lastName], (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
          return res.status(500).json({ error: 'Database error' });
        }

        res.status(201).json({ message: 'User created', userId: result.insertId, profilePicture: profilePicture || null });
      });
    });
  }

  // POST /api/users/login
  loginUser(req, res) {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    db.query('SELECT * FROM Users WHERE Username = ?', [username], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid username or password' });

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.Password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

      const token = jwt.sign({ id: user.ID, username: user.Username }, JWT_SECRET, { expiresIn: '24h' });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.ID,
          username: user.Username,
          firstName: user.FirstName,
          email: user.Email,
          bio: user.Bio,
          profilePicture: user.ProfilePicture
        }
      });
    });
  }

  // PUT /api/users/:id
  async updateUser(req, res) {
    const userId = parseInt(req.params.id);
    if (!req.user || userId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const { username, email, password, bio, firstName, lastName } = req.body;
    const profilePicture = req.file ? req.file.filename : req.body.profilePicture;
    
    if (
      !username &&
      !email &&
      !password &&
      bio === undefined &&
      !firstName &&
      !lastName &&
      !profilePicture
    ) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const fields = [];
    const values = [];

    if (username) {
      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
      }
      fields.push('Username = ?');
      values.push(username);
    }

    if (email) {
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      fields.push('Email = ?');
      values.push(email);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push('Password = ?');
      values.push(hashedPassword);
    }

    if (bio !== undefined) {
      fields.push('Bio = ?');
      values.push(bio);
    }

    if (firstName) {
      fields.push('FirstName = ?');
      values.push(firstName);
    }

    if (lastName) {
      fields.push('LastName = ?');
      values.push(lastName);
    }

    if (profilePicture) {
      fields.push('ProfilePicture = ?');
      values.push(profilePicture);
    }

    const sql = `UPDATE Users SET ${fields.join(', ')} WHERE ID = ?`;
    values.push(userId);

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("SQL error:", err);
        console.error("Executed query:", sql, values);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User updated successfully' });
    });
  }

  // PUT /api/users/change-password
  async changePassword(req, res) {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Provide both old and new passwords' });

    db.query('SELECT Password FROM Users WHERE ID = ?', [userId], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });

      const currentHash = results[0].Password;
      const match = await bcrypt.compare(oldPassword, currentHash);
      if (!match) return res.status(400).json({ error: 'Old password is incorrect' });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.query('UPDATE Users SET Password = ? WHERE ID = ?', [hashedNewPassword, userId], (err2) => {
        if (err2) return res.status(500).json({ error: 'Database error while updating password' });
        res.json({ message: 'Password changed successfully' });
      });
    });
  }

  // DELETE /api/users/:id
  deleteUser(req, res) {
    const userId = parseInt(req.params.id);
    if (!req.user || userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

    db.query('DELETE FROM Users WHERE ID = ?', [userId], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User deleted' });
    });
  }
}

module.exports = new UserController();
