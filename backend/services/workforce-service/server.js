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

app.use('/api/employees', require('./routes/employees'));
app.use('/api/timesheets', require('./routes/timesheets'));

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Labor Grid Workforce Service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'workforce',
  });
});

app.use((err, req, res, next) => {
  console.error('Workforce service error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`Workforce service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
