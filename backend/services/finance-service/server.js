const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const createCorsOptions = require('../shared/cors');

dotenv.config();
connectDB();

const app = express();
const corsOptions = createCorsOptions();

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.options('*', cors(corsOptions));

app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Labor Grid Finance Service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'finance',
  });
});

app.use((err, req, res, next) => {
  console.error('Finance service error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Finance service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
