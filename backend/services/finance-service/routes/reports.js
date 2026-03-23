const express = require('express');
const { body, validationResult, query } = require('express-validator');
const DailyTimesheet = require('../models/DailyTimesheet');
const MonthlySummary = require('../models/MonthlySummary');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { adminOrManager, allRoles } = require('../middleware/roleCheck');

const router = express.Router();

// @route   GET /api/reports/monthly/:employeeId/:year/:month
// @desc    Get monthly summary for specific employee
// @access  Private
router.get('/monthly/:employeeId/:year/:month', [auth, allRoles], async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    // Check if employee can access this report
    if (req.user.role === 'employee' && employeeId !== req.user.linkedEmployeeId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const monthlySummary = await MonthlySummary.findOne({
      employeeId,
      year: parseInt(year),
      month: parseInt(month)
    }).populate('employeeId', 'name employeeId position payRate otRate vacationPayRate');

    if (!monthlySummary) {
      return res.status(404).json({ message: 'Monthly summary not found' });
    }

    res.json(monthlySummary);
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reports/generate/:year/:month
// @desc    Generate monthly summaries for all employees
// @access  Private (Admin/Manager)
router.post('/generate/:year/:month', [auth, adminOrManager], async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate month and year
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    if (yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    // Get all active employees
    const employees = await Employee.find({ status: 'active' });
    const generatedSummaries = [];

    for (const employee of employees) {
      // Check if summary already exists
      let monthlySummary = await MonthlySummary.findOne({
        employeeId: employee._id,
        year: yearNum,
        month: monthNum
      });

      if (monthlySummary) {
        // Update existing summary
        await calculateMonthlySummary(monthlySummary, employee, yearNum, monthNum);
        monthlySummary.generatedBy = req.user.id;
        await monthlySummary.save();
      } else {
        // Create new summary
        monthlySummary = new MonthlySummary({
          employeeId: employee._id,
          year: yearNum,
          month: monthNum,
          generatedBy: req.user.id
        });
        await calculateMonthlySummary(monthlySummary, employee, yearNum, monthNum);
        await monthlySummary.save();
      }

      generatedSummaries.push(monthlySummary);
    }

    res.json({
      message: `Monthly summaries generated for ${generatedSummaries.length} employees`,
      summaries: generatedSummaries
    });
  } catch (error) {
    console.error('Generate monthly summaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate monthly summary
async function calculateMonthlySummary(monthlySummary, employee, year, month) {
  // Get start and end dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all timesheets for this employee in this month
  const timesheets = await DailyTimesheet.find({
    employeeId: employee._id,
    date: { $gte: startDate, $lte: endDate }
  });

  // Initialize totals
  let totalRegularHours = 0;
  let totalOTHours = 0;
  let totalVacationHours = 0;
  let totalHolidayHours = 0;

  // Calculate totals
  timesheets.forEach(timesheet => {
    const regularHours = Math.max(0, timesheet.totalHoursWorked - timesheet.otHours);
    totalRegularHours += regularHours;
    totalOTHours += timesheet.otHours;

    if (timesheet.isVacationWork) {
      totalVacationHours += timesheet.totalHoursWorked;
    }

    if (timesheet.isHolidayWork) {
      totalHolidayHours += timesheet.totalHoursWorked;
    }
  });

  // Update summary
  monthlySummary.totalRegularHours = totalRegularHours;
  monthlySummary.totalOTHours = totalOTHours;
  monthlySummary.totalVacationHours = totalVacationHours;
  monthlySummary.totalHolidayHours = totalHolidayHours;

  // Calculate payable amounts
  monthlySummary.calculatePayableAmount(employee);
}

// @route   GET /api/reports/monthly
// @desc    Get all monthly summaries with filters
// @access  Private (Admin/Manager)
router.get('/monthly', [auth, adminOrManager], async (req, res) => {
  try {
    const { page = 1, limit = 10, year, month, employeeId, status } = req.query;
    const query = {};

    // Add filters
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const summaries = await MonthlySummary.find(query)
      .populate('employeeId', 'name employeeId position')
      .populate('generatedBy', 'username')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MonthlySummary.countDocuments(query);

    res.json({
      summaries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get monthly summaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/reports/monthly/:id/finalize
// @desc    Finalize monthly summary
// @access  Private (Admin/Manager)
router.put('/monthly/:id/finalize', [auth, adminOrManager], async (req, res) => {
  try {
    const summary = await MonthlySummary.findById(req.params.id);
    
    if (!summary) {
      return res.status(404).json({ message: 'Monthly summary not found' });
    }

    if (summary.status === 'finalized') {
      return res.status(400).json({ message: 'Summary already finalized' });
    }

    summary.status = 'finalized';
    summary.finalizedAt = new Date();
    await summary.save();

    res.json({
      message: 'Monthly summary finalized successfully',
      summary
    });
  } catch (error) {
    console.error('Finalize summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/export/:year/:month
// @desc    Export monthly report (CSV format)
// @access  Private (Admin/Manager)
router.get('/export/:year/:month', [auth, adminOrManager], async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    const summaries = await MonthlySummary.find({
      year: yearNum,
      month: monthNum
    }).populate('employeeId', 'name employeeId position');

    // Generate CSV content
    let csvContent = 'Employee ID,Name,Position,Regular Hours,OT Hours,Vacation Hours,Holiday Hours,Total Payable\n';
    
    summaries.forEach(summary => {
      const employee = summary.employeeId;
      csvContent += `${employee.employeeId},${employee.name},${employee.position},${summary.totalRegularHours},${summary.totalOTHours},${summary.totalVacationHours},${summary.totalHolidayHours},${summary.totalPayableAmount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${year}-${month}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
