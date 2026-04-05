const createAuth = require('../../shared/middleware/createAuth');
const User = require('../models/User');

const auth = createAuth((id) => User.findById(id).select('-password'));

module.exports = auth;
