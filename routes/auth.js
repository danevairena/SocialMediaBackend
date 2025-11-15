router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM Users WHERE Username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = results[0];
        if (user.Password !== password) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const safeUser = {
            id: user.ID,
            username: user.Username,
            email: user.Email,
            firstName: user.FirstName,
            lastName: user.LastName,
            bio: user.Bio,
            profilePicture: user.ProfilePicture,
        };

        res.json({
            message: 'Login successful',
            user: safeUser
        });
    });
});