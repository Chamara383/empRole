const express = require('express');
const cors = require('cors');

const createServiceApp = ({ corsOptions, parseBody = true, jsonLimit = '10mb' } = {}) => {
  const app = express();

  if (corsOptions) {
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
  }

  if (parseBody) {
    app.use(express.json({ limit: jsonLimit }));
    app.use(express.urlencoded({ extended: true }));
  }

  return app;
};

const registerHealthRoute = (app, { message, service, extra = {} }) => {
  app.get('/api/health', (req, res) => {
    res.json({
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service,
      ...extra,
    });
  });
};

const registerDefaultHandlers = (
  app,
  { logLabel = 'Service', errorMessage = 'Internal server error' } = {}
) => {
  app.use((err, req, res, next) => {
    console.error(`${logLabel} error:`, err);
    res.status(500).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
};

module.exports = {
  createServiceApp,
  registerHealthRoute,
  registerDefaultHandlers,
};
