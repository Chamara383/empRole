const createCorsOptions = (extraOrigins = []) => {
  const allowedOrigins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5003',
    'http://localhost:5004',
    'http://localhost:5005',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5001',
    'http://127.0.0.1:5002',
    'http://127.0.0.1:5003',
    'http://127.0.0.1:5004',
    'http://127.0.0.1:5005',
    'http://67.202.16.83',
    'http://34.200.221.234',
    process.env.FRONTEND_URL,
    ...extraOrigins,
  ].filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
};

module.exports = createCorsOptions;
