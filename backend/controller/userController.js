const JWT = require('jsonwebtoken');
const userModel = require('../models/users.js');
const bcrypt = require('bcrypt')

const JWT_SECRET = 'JWT_SECRET' // Should be saved in .env
const saltRounds = 10;
// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) 
        return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 8) 
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // await the async createUser function
    const userID = await userModel.createUser(username, email, hashedPassword);

    res.status(201).json({ message: 'User created successfully', userID: Number(userID) });

  } catch (err) {
    console.error('Register error:', err.message);

    if (err.message === 'Username already exists' || err.message === 'Email already exists') {
      return res.status(409).json({ message: err.message });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

// Log in a user
const login = (req, res) => {
    const { username, password } = req.body;

    userModel.getUserByUsername(username, (err, user) => {
        if (err) {
            return res.status(500).json({ message: "Server error" });
        }

        if (!user) {
            // Always use the same response for invalid creds
            return res.status(401).json({ message: "Invalid credentials" });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: "Server error" });
            }

            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // Generate JWT
            const token = JWT.sign(
                { userID: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: "24h" }
            );

            // Set cookie 
            res.cookie("token", token, {
                httpOnly: true,
                secure: false,
                path: '/',
                sameSite: "lax",
            });

            // Successful login (don’t expose token in JSON if using cookies)
            res.json({ message: "Login successful", userID: user.id, token });
        });
    });
};


// Logout a user
const logout = (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true, // Ensure it matches the cookie attributes used when setting it
        secure: process.env.NODE_ENV === 'production', // Use the same secure setting
        sameSite: 'Strict', // Match the sameSite attribute
        path: '/' // important to match the original cookie
    });

    // Send a response to indicate successful logout
    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
    register, 
    login,
    logout,
}