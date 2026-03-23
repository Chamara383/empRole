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

app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));

registerHealthRoute(app, {
  message: 'Labor Grid Finance Service is running',
  service: 'finance',
});

registerDefaultHandlers(app, { logLabel: 'Finance service' });

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Finance service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
