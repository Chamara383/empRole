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

app.use('/api/employees', require('./routes/employees'));
app.use('/api/timesheets', require('./routes/timesheets'));

registerHealthRoute(app, {
  message: 'Labor Grid Workforce Service is running',
  service: 'workforce',
});

registerDefaultHandlers(app, { logLabel: 'Workforce service' });

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`Workforce service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
