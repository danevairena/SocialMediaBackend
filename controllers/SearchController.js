const db = require("../models/db");


//GET http://localhost:3001/api/users/search?q=:username
exports.searchUsers = async (req, res) => {
  const q = req.query.q || "";

  if (!q.trim()) {
    return res.json([]);
  }

  const sql = `
    SELECT Username, ProfilePicture
    FROM Users
    WHERE Username LIKE ? COLLATE utf8mb4_general_ci
    ORDER BY Username ASC
    LIMIT 10
  `;
  const params = [`%${q}%`];

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Search error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const results = rows.map(user => ({
      ...user,
      ProfilePicture: user.ProfilePicture
        ? `http://localhost:3001/uploads/profile_pics/${user.ProfilePicture}`
        : '/default-avatar.png'
    }));

    res.json(results);
  });
};