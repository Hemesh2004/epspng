const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

// Use the environment variable $PORT provided by Heroku or default to 3000
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
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB max file size
});

// Serve static files from 'uploads' and 'downloads' directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(os.homedir(), 'Downloads')));

// Route to handle file upload and conversion
app.post('/convert', upload.single('epsFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const inputFile = path.join(__dirname, 'uploads', req.file.filename);
  const outputFile = path.join(os.homedir(), 'Downloads', req.file.originalname.replace('.eps', '.png'));

  console.log(`Converting: ${inputFile} to ${outputFile}`);

  const command = `magick -verbose "${inputFile}" "${outputFile}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error converting file:', req.file.originalname);
      console.error('stderr:', stderr);
      console.error('stdout:', stdout);
      return res.status(500).send('Error converting file.');
    }

    console.log(`Converted: ${req.file.originalname} to ${outputFile}`);
    res.json({
      message: 'File converted successfully!',
      downloadLink: `/downloads/${path.basename(outputFile)}`
    });
  });
});

// Route to serve index.html (for the upload form)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
