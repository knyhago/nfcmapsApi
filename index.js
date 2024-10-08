require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://knyhago:kenny@cluster0.2kzve.mongodb.net/yourDatabaseName?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Define Schemas and Models
const exitSchema = new mongoose.Schema({
  n: String,
  l: [Number]
});

const pointSchema = new mongoose.Schema({
  i: String,
  l: [Number],
  e: exitSchema,
  caution: String
});

const locationSchema = new mongoose.Schema({
  t: String,
  id: String,
  c: [Number],
  r: Number,
  p: [pointSchema]
});

const Location = mongoose.model('Location', locationSchema);

// Initialize data (can be fetched from DB or added initially)
const data = new Location({
  t: "g",
  id: "green1",
  c: [-0.0994, 51.5808],
  r: 5,
  p: [
    new mongoose.model('Point', pointSchema)({
      i: "r1",
      l: [-0.1032, 51.5904],
      e: new mongoose.model('Exit', exitSchema)({ n: "A", l: [-0.0906, 51.5898] }),
      caution: "Caution: Heavy traffic during rush hours"
    }),
    new mongoose.model('Point', pointSchema)({
      i: "r2",
      l: [-0.0994, 51.5808],
      e: new mongoose.model('Exit', exitSchema)({ n: "B", l: [-0.1024, 51.5686] }),
      caution: "Caution: Construction work in progress"
    }),
    new mongoose.model('Point', pointSchema)({
      i: "r3",
      l: [-0.1101, 51.5863],
      e: new mongoose.model('Exit', exitSchema)({ n: "C", l: [-0.1359, 51.5820] }),
      caution: "Caution: Narrow lanes ahead"
    })
  ]
});

// Save the initial data to MongoDB only if it doesn't exist
Location.findOne({ id: "green1" }).then(existingLocation => {
  if (!existingLocation) {
    data.save().then(() => console.log('Initial data saved')).catch(err => console.error('Error saving initial data:', err));
  } else {
    console.log('Initial data already exists');
  }
}).catch(err => console.error('Error checking for existing data:', err));

// API endpoint to get all green tag locations
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find({}, 'id c r'); // Only fetch id, center coordinates, and radius
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get location by green tag ID
app.get('/api/location/:id', async (req, res) => {
  try {
    const location = await Location.findOne({ id: req.params.id });
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint for creating a new green tag location
app.post('/api/location', async (req, res) => {
  try {
    const newLocation = req.body;

    if (!newLocation || typeof newLocation !== 'object' || !newLocation.id || !Array.isArray(newLocation.c) || typeof newLocation.r !== 'number') {
      return res.status(400).json({ error: "Invalid data format. Expected a new location object with 't', 'id', 'c', and 'r' properties." });
    }

    const existingLocation = await Location.findOne({ id: newLocation.id });
    if (existingLocation) {
      return res.status(409).json({ error: "A location with this ID already exists" });
    }

    const location = new Location(newLocation);
    await location.save();

    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint for adding a point to an existing location
app.post('/api/location/:id', async (req, res) => {
  try {
    const newPoint = req.body;

    if (!newPoint || typeof newPoint !== 'object' || !newPoint.i || !Array.isArray(newPoint.l) || !newPoint.e || !newPoint.caution) {
      return res.status(400).json({ error: "Invalid data format. Expected a new point object with 'i', 'l', 'e', and 'caution' properties." });
    }

    const location = await Location.findOneAndUpdate(
      { id: req.params.id },
      { $push: { p: newPoint } },
      { new: true }
    );

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});