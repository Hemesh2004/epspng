const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set uploads folder for temporary file storage
    const uploadDir = path.join(__dirname, 'uploads');
    // Make sure the uploads folder exists
    fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a timestamp to avoid name collisions
  }
});

const upload = multer({ storage: storage });

// Serve static files from 'uploads' and 'downloads' directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(os.homedir(), 'Downloads')));

// Route to handle file upload and conversion
app.post('/convert', upload.single('epsFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Input file path
  const inputFile = path.join(__dirname, 'uploads', req.file.filename);

  // Extract the original file name (without the .eps extension)
  const outputFileName = path.basename(req.file.originalname, '.eps');

  // Define the output file path in Downloads folder with the same name, but with .png extension
  const outputFile = path.join(os.homedir(), 'Downloads', `${outputFileName}.png`);

  console.log(`Converting: ${inputFile} to ${outputFile}`);

  // Use ImageMagick to convert EPS to PNG
  const command = `magick -verbose "${inputFile}" "${outputFile}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error converting file:', req.file.originalname);
      console.error('stderr:', stderr);
      console.error('stdout:', stdout);
      return res.status(500).send('Error converting file.');
    }

    console.log(`Converted: ${req.file.originalname} to ${outputFile}`);

    // Send the path to the converted file (or a download link)
    res.json({
      message: 'File converted successfully!',
      downloadLink: `/downloads/${path.basename(outputFile)}`,
      filePath: outputFile // Send the full file path for UI updates
    });
  });
});

// Route to serve index.html (for the upload form)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${port}`);
});

