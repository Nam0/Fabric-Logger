/* server.js */

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data', 'fabrics.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

// Ensure necessary folders n files are real
if (!fs.existsSync(DATA_FILE)) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, '[]');
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

function sanitizeFilename(filename) {
  return filename
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

// TMP context for multer filename generation
const uploadContext = {};
const preProcessForm = (req, res, next) => {
  const rawName = req.body?.name?.trim() || 'fabric';
  const sanitized = sanitizeFilename(rawName);
  const id = Date.now().toString();

  uploadContext.name = sanitized;
  uploadContext.id = id;
  req.generatedId = id;
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uploadContext.name}-${uploadContext.id}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

const readFabrics = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return [];
  }
};
const writeFabrics = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// GET /fabrics?search=term
app.get('/fabrics', (req, res) => {
  const search = (req.query.search || '').toLowerCase();
  const fabrics = readFabrics();

  if (search) {
    const filtered = fabrics.filter(f =>
      (f.name && f.name.toLowerCase().includes(search)) ||
      (f.type && f.type.toLowerCase().includes(search)) ||
      (f.color && f.color.toLowerCase().includes(search)) ||
      (f.tags && f.tags.some(tag => tag.toLowerCase().includes(search))) ||
      (f.length != null && f.length.toString().includes(search)) ||
      (f.width != null && f.width.toString().includes(search))
    );
    return res.json(filtered);
  }

  res.json(fabrics);
});

// POST /fabrics
app.post('/fabrics', preProcessForm, upload.single('image'), async (req, res) => {
  try {
    const fabrics = readFabrics();
    const { name, type, color, tags, length, width, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and Type are required' });
    }

    const parsedTags = tags
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    let uniqueName = name.trim();
    if (fabrics.some(f => f.name === uniqueName)) {
      let suffix = 2;
      while (fabrics.some(f => f.name === `${uniqueName}(${suffix})`)) suffix++;
      uniqueName = `${uniqueName}(${suffix})`;
    }

    // Resize image if uploaded
    if (req.file) {
      const filename = `${uploadContext.name}-${uploadContext.id}${path.extname(req.file.originalname)}`;
      const inputPath = path.join(UPLOAD_DIR, filename);
      const tempPath = path.join(UPLOAD_DIR, 'resized-' + filename);

      try {
        await sharp(inputPath)
          .resize(512, 512, {
            fit: sharp.fit.cover,
            position: sharp.strategy.entropy,
          })
          .toFile(tempPath);
        fs.unlinkSync(inputPath);
        fs.renameSync(tempPath, inputPath);
      } catch (err) {
        console.error('Image processing failed:', err);
      }
    }

    const parsedLength = parseFloat(length);
    const parsedWidth = parseFloat(width);

    const imagePath = req.file
      ? `/uploads/${uploadContext.name}-${uploadContext.id}${path.extname(req.file.originalname)}`
      : null;

    const newFabric = {
      id: req.generatedId,
      name: uniqueName,
      type: type.trim(),
      color: color?.trim() || '',
      tags: parsedTags,
      length: isNaN(parsedLength) ? null : parsedLength,
      width: isNaN(parsedWidth) ? null : parsedWidth,
      notes: notes?.trim() || '',
      image: imagePath
    };

    fabrics.push(newFabric);
    writeFabrics(fabrics);
    res.status(201).json(newFabric);
  } catch (err) {
    console.error('POST /fabrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /fabrics/:id
app.delete('/fabrics/:id', (req, res) => {
  let fabrics = readFabrics();
  const id = req.params.id;
  const fabric = fabrics.find(f => f.id === id);

  if (!fabric) return res.status(404).json({ error: 'Fabric not found' });

  if (fabric.image) {
    const imagePath = path.join(UPLOAD_DIR, path.basename(fabric.image));
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }
  }

  fabrics = fabrics.filter(f => f.id !== id);
  writeFabrics(fabrics);
  res.json({ success: true });
});

// PUT /fabrics/:id
app.put('/fabrics/:id', (req, res) => {
  const id = req.params.id;
  const fabrics = readFabrics();
  const fabricIndex = fabrics.findIndex(f => f.id === id);

  if (fabricIndex === -1) {
    return res.status(404).json({ error: 'Fabric not found' });
  }

  const fabric = fabrics[fabricIndex];
  const updated = {
    ...fabric,
    ...req.body,
    length: req.body.length !== undefined ? parseFloat(req.body.length) : fabric.length,
    width: req.body.width !== undefined ? parseFloat(req.body.width) : fabric.width,
    tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : fabric.tags
  };

  fabrics[fabricIndex] = updated;
  writeFabrics(fabrics);
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Fabric Logger running at http://localhost:${PORT}`);
});
