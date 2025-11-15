const express = require("express");
const { searchUsers } = require("../controllers/SearchController");

const router = express.Router();

//GET http://localhost:3001/api/users/search?q=:username
router.get("/", searchUsers);

module.exports = router;
