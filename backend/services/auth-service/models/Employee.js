const mongoose = require('mongoose');

// Lightweight model registration for user-management populate calls.
// Auth service only needs these fields to resolve linkedEmployeeId references.
const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
  },
  {
    strict: false,
    timestamps: true,
  }
);

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
