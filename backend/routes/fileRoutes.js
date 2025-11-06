const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const File = require("../models/file");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileString = req.file.buffer.toString("base64");
    const uploadStr = `data:${req.file.mimetype};base64,${fileString}`;

    // Use 'raw' resource type for PDFs, 'auto' for others
    const resourceType = req.file.mimetype === "application/pdf" ? "raw" : "auto";

    // Upload the file without transformation options
    const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
      resource_type: resourceType
    });

    // Generate file URL: For PDFs, explicitly set transformation for inline viewing
    let fileUrl = uploadResponse.secure_url;
    if (req.file.mimetype === "application/pdf") {
      fileUrl = cloudinary.url(uploadResponse.public_id, {
        secure: true,
        resource_type: 'raw',
        transformation: "fl_attachment:false"
      });
    }

    const file = new File({
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: fileUrl,
      fileSize: req.file.size
    });
    
    await file.save();
    res.status(201).json(file);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

router.get("/files", async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Error fetching files" });
  }
});

module.exports = router;