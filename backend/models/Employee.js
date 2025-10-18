const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  position: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  dateOfEmployment: {
    type: Date,
    required: true,
    default: Date.now
  },
  payRate: {
    type: Number,
    required: true,
    min: 0
  },
  otRate: {
    type: Number,
    required: true,
    min: 0
  },
  vacationPayRate: {
    type: Number,
    required: true,
    min: 0
  },
  breakTimeConfig: {
    isPaid: {
      type: Boolean,
      default: false
    },
    duration: {
      type: Number,
      default: 0, // in minutes
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },
  personalInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  passwordResetInfo: {
    dateOfBirth: {
      type: Date,
      required: function() {
        return this.role === 'employee';
      }
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
employeeSchema.index({ status: 1 });
employeeSchema.index({ name: 'text', position: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
