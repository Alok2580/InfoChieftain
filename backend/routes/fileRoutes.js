const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const File = require("../models/file");

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});

// Route to handle file uploads
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert buffer to base64
    const fileString = req.file.buffer.toString("base64");
    const uploadStr = `data:${req.file.mimetype};base64,${fileString}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
      resource_type: "auto",
    });

    // Create new file document
    const file = new File({
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: uploadResponse.secure_url,
    });

    // Save to database
    await file.save();

    res.status(201).json(file);
  } catch (error) {
    console.error("Error in file upload:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

// Route to get all files
router.get("/files", async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Error fetching files" });
  }
});

module.exports = router;
