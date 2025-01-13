const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

// Route to handle file upload and conversion
app.post('/convert', upload.array('epsFiles'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  const resolution = req.body.resolution || 'normal';
  const savePath = path.resolve(req.body.savePath);

  if (!fs.existsSync(savePath)) {
    return res.status(400).send('The specified save location does not exist.');
  }

  // Set DPI values based on resolution selection
  const dpiMap = {
    '0.5': '150',
    'normal': '300',
    '2': '600',
  };
  const dpi = dpiMap[resolution] || '300';

  try {
    const conversionPromises = req.files.map(file => {
      const inputFile = path.join(__dirname, 'uploads', file.filename);
      const outputFile = path.join(savePath, file.originalname.replace('.eps', `.png`));

      // Use ImageMagick's 'magick convert' to apply DPI settings
      const command = `magick convert -density ${dpi} "${inputFile}" "${outputFile}"`;

      return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error(`Error converting file: ${file.originalname}`);
            console.error(stderr);
            reject(err);
          } else {
            resolve({
              filename: file.originalname.replace('.eps', '.png'),
              path: outputFile,
            });
          }
        });
      });
    });

    // Execute all conversions in parallel
    const convertedFiles = await Promise.all(conversionPromises);

    // Send response with saved file paths
    res.json({ files: convertedFiles });
  } catch (error) {
    console.error('Error during file conversion:', error);
    res.status(500).send('An error occurred during the conversion process.');
  }
});

// Serve the HTML form
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
