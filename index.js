require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const swapRoutes = require('./routes/swaps');

const app = express();

const defaultOrigins = [
  'https://slot-swapper-frontend-eta.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];
const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || defaultOrigins.join(','))
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production') {
  const weakSecrets = new Set(['mystrongsecret', 'secret', 'changeme', 'password']);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || weakSecrets.has(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET must be set to a strong production secret of at least 32 characters');
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', swapRoutes); // swappable-slots, swap-request, swap-response

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('MongoDB connected');
    app.listen(PORT, ()=> console.log('Server running on', PORT));
  })
  .catch(err=> {
    console.error('Mongo connect error', err);
    process.exit(1);
  });
