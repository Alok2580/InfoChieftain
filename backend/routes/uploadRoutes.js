const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const File = require('../models/file');

const storage = multer.diskStorage({});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
    });

    const newFile = new File({
      fileName: req.file.originalname,
      filePath: result.secure_url,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    await newFile.save();

    res.json(newFile);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/files', async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;