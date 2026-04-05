const mongoose = require('mongoose');

const dailyExpenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ['transport', 'meals', 'accommodation', 'supplies', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR',
    enum: ['LKR', 'USD', 'EUR'],
    uppercase: true
  },
  receipt: {
    type: String, // URL or file path for receipt
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
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
    enum: ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
dailyExpenseSchema.index({ employeeId: 1, date: 1 });
dailyExpenseSchema.index({ date: 1 });
dailyExpenseSchema.index({ status: 1 });
dailyExpenseSchema.index({ category: 1 });

module.exports = mongoose.model('DailyExpense', dailyExpenseSchema);

