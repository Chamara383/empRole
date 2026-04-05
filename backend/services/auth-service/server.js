const dotenv = require('dotenv');
const connectDB = require('./config/db');
const createCorsOptions = require('../shared/cors');
const {
  createServiceApp,
  registerHealthRoute,
  registerDefaultHandlers,
} = require('../shared/expressApp');

dotenv.config();
connectDB();

const corsOptions = createCorsOptions();
const app = createServiceApp({ corsOptions, parseBody: true });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/user-management', require('./routes/userManagement'));

registerHealthRoute(app, {
  message: 'Labor Grid Auth Service is running',
  service: 'auth',
});

registerDefaultHandlers(app, { logLabel: 'Auth service' });

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
