const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path')

const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
const testRoutes  = require('./routes/testRoutes');

const app = express();

const userModel = require('./models/users')

// CORS first
app.use(cors({
  origin: true,
  methods: ['GET','PUT','POST','DELETE'],
  credentials: true,
}));

// Enable file upload BEFORE body parsers; set limits
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB, adjust for your needs
  abortOnLimit: true,
}));

app.use(cookieParser());

// Body parsers (safe after fileUpload)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/videos/test', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api', userRoutes);
app.use('/api', videoRoutes);
app.use('/api', testRoutes);


// Serve static files from 'uploads' and 'thumbnails' directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

app.get('/api/test-db', async (req, res) => {
  try {
    // Example: fetch all users
    userModel.getAllUsers((err, users) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json({ message: 'DB connection successful', users });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Simple health route
app.get('/', (req, res) => res.send('Backend is running!'));

// ONE listen only
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
