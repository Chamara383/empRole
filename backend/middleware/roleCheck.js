const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('Role check failed:', {
        userRole: req.user.role,
        allowedRoles: allowedRoles,
        userId: req.user._id,
        username: req.user.username
      });
      return res.status(403).json({ 
        message: `Access denied. Insufficient permissions. Required role: ${allowedRoles.join(' or ')}, Your role: ${req.user.role || 'none'}` 
      });
    }

    next();
  };
};

// Specific role checkers
const adminOnly = roleCheck('admin');
const adminOrManager = roleCheck('admin', 'manager');
const allRoles = roleCheck('admin', 'manager', 'employee');

module.exports = {
  roleCheck,
  adminOnly,
  adminOrManager,
  allRoles
};
