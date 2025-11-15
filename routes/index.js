const express = require('express');
const router = express.Router();

// Mount all routers
router.use('/users',        require('./users'));
router.use('/posts',        require('./posts'));
router.use('/comments',     require('./comments'));
router.use('/likes',        require('./likes'));
router.use('/followers',    require('./followers'));
router.use('/follow',       require('./followers'));
router.use('/notifications',require('./notifications'));
router.use('/search',       require('./search'));
router.use('/messages',     require('./messages'));


module.exports = router;