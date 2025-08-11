const express = require('express');
const router = express.Router();
const { register, login } = require("../controllers/userController");

// POST /api/users/register
router.post('/register', register);

// POST /api/users/login
router.post('/login', login);

module.exports = router;
