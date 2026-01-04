const express = require('express');
const { body, validationResult, query } = require('express-validator');
const DailyTimesheet = require('../models/DailyTimesheet');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { adminOrManager, allRoles } = require('../middleware/roleCheck');

const router = express.Router();

// @route   GET /api/timesheets
// @desc    Get timesheets (filtered by role)
// @access  Private
router.get('/', [auth, allRoles], async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, startDate, endDate, status } = req.query;
    const query = {};

    // Filter by employee ID based on role
    if (req.user.role === 'employee') {
      // Employees can only see their own timesheets
      const employee = await Employee.findOne({ _id: req.user.linkedEmployeeId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee record not found' });
      }
      query.employeeId = employee._id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const timesheets = await DailyTimesheet.find(query)
      .populate('employeeId', 'name employeeId position')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DailyTimesheet.countDocuments(query);

    res.json({
      timesheets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/timesheets/:id
// @desc    Get specific timesheet
// @access  Private
router.get('/:id', [auth, allRoles], async (req, res) => {
  try {
    const timesheet = await DailyTimesheet.findById(req.params.id)
      .populate('employeeId', 'name employeeId position')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // Check if employee can access this timesheet
    if (req.user.role === 'employee' && 
        timesheet.employeeId._id.toString() !== req.user.linkedEmployeeId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(timesheet);
  } catch (error) {
    console.error('Get timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/timesheets/employee/:employeeId
// @desc    Get employee timesheets
// @access  Private (Admin/Manager)
router.get('/employee/:employeeId', [auth, adminOrManager], async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const query = { employeeId: req.params.employeeId };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const timesheets = await DailyTimesheet.find(query)
      .populate('employeeId', 'name employeeId position')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DailyTimesheet.countDocuments(query);

    res.json({
      timesheets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get employee timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/timesheets
// @desc    Create daily timesheet entry
// @access  Private (All roles - employees can create their own)
router.post('/', [
  auth,
  allRoles,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('breakTime').optional().isNumeric().withMessage('Break time must be a number'),
  body('isVacationWork').optional().isBoolean().withMessage('Vacation work must be boolean'),
  body('isHolidayWork').optional().isBoolean().withMessage('Holiday work must be boolean'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      date,
      employeeId,
      startTime,
      endTime,
      breakTime = 0,
      isVacationWork = false,
      isHolidayWork = false,
      notes
    } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // If user is an employee, ensure they can only create timesheets for themselves
    if (req.user.role === 'employee') {
      if (employeeId.toString() !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only create timesheets for yourself' 
        });
      }
    }

    // Check if timesheet already exists for this date and employee
    const existingTimesheet = await DailyTimesheet.findOne({
      employeeId,
      date: new Date(date)
    });

    if (existingTimesheet) {
      return res.status(400).json({ message: 'Timesheet already exists for this date and employee' });
    }

    const timesheet = new DailyTimesheet({
      date: new Date(date),
      employeeId,
      startTime,
      endTime,
      breakTime,
      isVacationWork,
      isHolidayWork,
      notes,
      createdBy: req.user.id
    });

    await timesheet.save();

    // Populate the response
    await timesheet.populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.status(201).json({
      message: 'Timesheet created successfully',
      timesheet
    });
  } catch (error) {
    console.error('Create timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/timesheets/:id
// @desc    Update timesheet entry
// @access  Private (All roles - employees can update their own)
router.put('/:id', [
  auth,
  allRoles,
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('breakTime').optional().isNumeric().withMessage('Break time must be a number'),
  body('isVacationWork').optional().isBoolean().withMessage('Vacation work must be boolean'),
  body('isHolidayWork').optional().isBoolean().withMessage('Holiday work must be boolean'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const timesheet = await DailyTimesheet.findById(req.params.id);
    
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // If user is an employee, ensure they can only update their own timesheets
    if (req.user.role === 'employee') {
      // Populate employeeId if not already populated
      if (!timesheet.employeeId._id) {
        await timesheet.populate('employeeId', '_id');
      }
      const timesheetEmployeeId = timesheet.employeeId._id 
        ? timesheet.employeeId._id.toString() 
        : timesheet.employeeId.toString();
      
      if (timesheetEmployeeId !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only update your own timesheets' 
        });
      }
    }

    // Update timesheet
    const updatedTimesheet = await DailyTimesheet.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        lastModifiedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'createdBy', select: 'username' },
      { path: 'lastModifiedBy', select: 'username' }
    ]);

    res.json({
      message: 'Timesheet updated successfully',
      timesheet: updatedTimesheet
    });
  } catch (error) {
    console.error('Update timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/timesheets/:id
// @desc    Delete timesheet entry
// @access  Private (Admin only)
router.delete('/:id', [auth, adminOrManager], async (req, res) => {
  try {
    const timesheet = await DailyTimesheet.findById(req.params.id);
    
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    await DailyTimesheet.findByIdAndDelete(req.params.id);

    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Delete timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
