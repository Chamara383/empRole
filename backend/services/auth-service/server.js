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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/user-management', require('./routes/userManagement'));

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Labor Grid Auth Service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'auth',
  });
});

app.use((err, req, res, next) => {
  console.error('Auth service error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
