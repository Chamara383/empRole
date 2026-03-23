const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const createCorsOptions = require('../shared/cors');
const {
  createServiceApp,
  registerHealthRoute,
  registerDefaultHandlers,
} = require('../shared/expressApp');

dotenv.config();

const corsOptions = createCorsOptions();
const app = createServiceApp({ corsOptions, parseBody: false });

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

registerHealthRoute(app, {
  message: 'Labor Grid Gateway is running',
  service: 'gateway',
  extra: { targets },
});

registerDefaultHandlers(app, {
  logLabel: 'Gateway',
  errorMessage: 'Gateway error',
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('Targets:', targets);
});
