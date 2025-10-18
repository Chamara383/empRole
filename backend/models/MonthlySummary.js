const mongoose = require('mongoose');

const monthlySummarySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  totalRegularHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOTHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVacationHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalHolidayHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPayableAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  breakdown: {
    regularPay: {
      type: Number,
      default: 0
    },
    otPay: {
      type: Number,
      default: 0
    },
    vacationPay: {
      type: Number,
      default: 0
    },
    holidayPay: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'finalized', 'paid'],
    default: 'draft'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  finalizedAt: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
monthlySummarySchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });
monthlySummarySchema.index({ year: 1, month: 1 });
monthlySummarySchema.index({ status: 1 });

// Method to calculate total payable amount
monthlySummarySchema.methods.calculatePayableAmount = function(employee) {
  this.breakdown.regularPay = this.totalRegularHours * employee.payRate;
  this.breakdown.otPay = this.totalOTHours * employee.otRate;
  this.breakdown.vacationPay = this.totalVacationHours * employee.vacationPayRate;
  this.breakdown.holidayPay = this.totalHolidayHours * employee.payRate; // Holiday pay at regular rate
  
  this.totalPayableAmount = 
    this.breakdown.regularPay + 
    this.breakdown.otPay + 
    this.breakdown.vacationPay + 
    this.breakdown.holidayPay;
};

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema);
