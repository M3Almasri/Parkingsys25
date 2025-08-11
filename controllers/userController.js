const jwt = require('jsonwebtoken');
const User = require("../models/User");

// Function to generate a login token (JWT)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register a new user
exports.register = async (req, res) => {
  const { username, password } = req.body;

  try {
const user = await User.create({ username, password, role: 'user' });
res.json({ token: generateToken(user._id), username, role: user.role });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
};

// Login an existing user
exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !(await user.matchPassword(password))) {
  return res.status(401).json({ message: 'Invalid credentials' });
}

res.json({ token: generateToken(user._id), username, role: user.role });
};
