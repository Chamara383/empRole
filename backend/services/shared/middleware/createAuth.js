const jwt = require('jsonwebtoken');

const createAuth = (getUserById) => {
  if (typeof getUserById !== 'function') {
    throw new Error('createAuth requires a getUserById function');
  }

  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getUserById(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Token is not valid' });
    }
  };
};

module.exports = createAuth;
