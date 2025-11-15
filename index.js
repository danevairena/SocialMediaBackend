const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files from "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import shared DB connection
const db = require('./models/db');

// Attach db to req 
app.use((req, res, next) => {
  req.db = db;
  next();
});

//-----------Routes -----------

// Health‑check
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Mount all API routes from /routes/index.js
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

//--------- Start Server -----------
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});