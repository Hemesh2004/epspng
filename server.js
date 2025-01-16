const express = require("express");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage , limits: { fileSize: 10 * 1024 * 1024 },
});

// Static folder for serving HTML files
app.use(express.static("public"));

// Route for the root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route to handle file uploads and conversion
app.post("/convert", upload.array("epsFiles"), async (req, res) => {
  const savePath = req.body.savePath; // User-specified save directory

  if (!savePath || !fs.existsSync(savePath)) {
    return res.status(400).send("Invalid or missing save path.");
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded.");
  }

  const convertedFiles = [];

  // Process each uploaded file
  for (const file of req.files) {
    const inputFile = path.join(uploadDir, file.filename);
    const outputFile = path.join(savePath, `${path.parse(file.originalname).name}.png`);

    try {
      // Use ImageMagick command to convert EPS to PNG
      await new Promise((resolve, reject) => {
        const command = `magick convert -density 300 -quality 100 -colorspace sRGB -depth 8 -flatten "${inputFile}" "${outputFile}"`;

        exec(command, (err) => {
          if (err) {
            console.error("Error during file conversion:", err);
            return reject(err);
          }
          resolve();
        });
      });

      convertedFiles.push(outputFile);
    } catch (error) {
      console.error("Conversion failed for file:", file.originalname, error);
      return res.status(500).send("Error converting file(s).");
    }
  }

  res.json({ message: "Files converted successfully!", files: convertedFiles });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
