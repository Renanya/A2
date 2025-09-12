// routes/testRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Test file upload endpoint
// routes/testRoutes.js
router.post('/test-upload', (req, res) => {
  console.log('files keys:', req.files ? Object.keys(req.files) : []);
  if (!req.files) return res.status(400).json({ message: 'No file uploaded' });
  // accept any field name:
  const anyKey = Object.keys(req.files)[0];
  const file = req.files[anyKey];
  res.json({ ok: true, received: Array.isArray(file) ? file.map(f=>f.name) : file.name });
});


module.exports = router;
