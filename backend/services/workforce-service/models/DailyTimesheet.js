const mongoose = require('mongoose');

const dailyTimesheetSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  breakTime: {
    type: Number,
    default: 0,
    min: 0,
    max: 480 // Max 8 hours break
  },
  totalHoursWorked: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0
  },
  otHours: {
    type: Number,
    default: 0,
    min: 0
  },
  isVacationWork: {
    type: Boolean,
    default: false
  },
  isHolidayWork: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
dailyTimesheetSchema.index({ employeeId: 1, date: 1 });
dailyTimesheetSchema.index({ date: 1 });
dailyTimesheetSchema.index({ status: 1 });

// Pre-save middleware to calculate total hours and OT
dailyTimesheetSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('endTime') || this.isModified('breakTime')) {
    this.calculateHours();
  }
  next();
});

// Method to calculate hours worked
dailyTimesheetSchema.methods.calculateHours = function() {
  const start = this.parseTime(this.startTime);
  const end = this.parseTime(this.endTime);
  
  let totalMinutes = end - start;
  
  // Handle overnight shifts
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Add 24 hours
  }
  
  // Subtract break time (in minutes)
  totalMinutes -= this.breakTime;
  
  // Convert to hours
  this.totalHoursWorked = Math.max(0, totalMinutes / 60);
  
  // Calculate OT (assuming 8 hours is regular, configurable later)
  const regularHours = 8; // This should come from system settings
  this.otHours = Math.max(0, this.totalHoursWorked - regularHours);
};

// Helper method to parse time string to minutes
dailyTimesheetSchema.methods.parseTime = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

module.exports = mongoose.model('DailyTimesheet', dailyTimesheetSchema);
