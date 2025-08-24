const jwt = require('jsonwebtoken');

// Middleware to verify a user's JSON Web Token (JWT)
exports.authenticate = (req, res, next) => {
    // Get the token from the request header (e.g., "Bearer eyJhbGci...")
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        // If no token is provided, deny access
        return res.status(401).json({ message: 'Authentication failed: No token provided.' });
    }

    try {
        // Try to verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret');
        // If successful, add the user's info to the request object
        req.user = decoded;
        // Continue to the next function in the route
        next();
    } catch (error) {
        // If the token is invalid, deny access
        return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    }
};
