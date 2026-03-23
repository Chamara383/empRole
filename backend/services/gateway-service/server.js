const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const createCorsOptions = require('../shared/cors');

dotenv.config();

const app = express();
const corsOptions = createCorsOptions();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const targets = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5003',
  workforce: process.env.WORKFORCE_SERVICE_URL || 'http://localhost:5004',
  finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:5005',
};

const proxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 15000,
  timeout: 15000,
  pathRewrite: (path, req) => req.originalUrl,
});

const routeProxy = (routePrefix, target) => {
  const handler = proxy(target);
  return (req, res, next) => {
    if (req.path.startsWith(routePrefix)) {
      return handler(req, res, next);
    }
    return next();
  };
};

app.use(routeProxy('/api/auth', targets.auth));
app.use(routeProxy('/api/password-reset', targets.auth));
app.use(routeProxy('/api/user-management', targets.auth));
app.use(routeProxy('/api/employees', targets.workforce));
app.use(routeProxy('/api/timesheets', targets.workforce));
app.use(routeProxy('/api/expenses', targets.finance));
app.use(routeProxy('/api/reports', targets.finance));

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Labor Grid Gateway is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'gateway',
    targets,
  });
});

app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    message: 'Gateway error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('Targets:', targets);
});
