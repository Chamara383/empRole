const express = require('express');
const { body, validationResult, query } = require('express-validator');
const DailyExpense = require('../models/DailyExpense');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { adminOrManager, allRoles } = require('../middleware/roleCheck');

const router = express.Router();

// @route   GET /api/expenses
// @desc    Get expenses (filtered by role)
// @access  Private
router.get('/', [auth, allRoles], async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, startDate, endDate, status, category } = req.query;
    const query = {};

    // Filter by employee ID based on role
    if (req.user.role === 'employee') {
      // Employees can only see their own expenses
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

    // Category filter
    if (category) {
      query.category = category;
    }

    const expenses = await DailyExpense.find(query)
      .populate('employeeId', 'name employeeId position')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .populate('approvedBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DailyExpense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get specific expense
// @access  Private
router.get('/:id', [auth, allRoles], async (req, res) => {
  try {
    const expense = await DailyExpense.findById(req.params.id)
      .populate('employeeId', 'name employeeId position')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .populate('approvedBy', 'username');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if employee can access this expense
    if (req.user.role === 'employee' && 
        expense.employeeId._id.toString() !== req.user.linkedEmployeeId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/expenses
// @desc    Create daily expense entry
// @access  Private (All roles - employees can create their own)
router.post('/', [
  auth,
  allRoles,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
  body('category').isIn(['transport', 'meals', 'accommodation', 'supplies', 'other']).withMessage('Valid category is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('currency').optional().isIn(['LKR', 'USD', 'EUR']).withMessage('Valid currency is required'),
  body('receipt').optional().isString().withMessage('Receipt must be a string'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      date,
      employeeId,
      category,
      description,
      amount,
      currency = 'LKR',
      receipt,
      notes
    } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // If user is an employee, ensure they can only create expenses for themselves
    if (req.user.role === 'employee') {
      if (employeeId.toString() !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only create expenses for yourself' 
        });
      }
    }

    const expense = new DailyExpense({
      date: new Date(date),
      employeeId,
      category,
      description,
      amount: parseFloat(amount),
      currency,
      receipt,
      notes,
      createdBy: req.user.id,
      status: 'draft'
    });

    await expense.save();

    // Populate the response
    await expense.populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.status(201).json({
      message: 'Expense created successfully',
      expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense entry
// @access  Private (All roles - employees can update their own)
router.put('/:id', [
  auth,
  allRoles,
  body('category').optional().isIn(['transport', 'meals', 'accommodation', 'supplies', 'other']).withMessage('Valid category is required'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('currency').optional().isIn(['LKR', 'USD', 'EUR']).withMessage('Valid currency is required'),
  body('receipt').optional().isString().withMessage('Receipt must be a string'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await DailyExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // If user is an employee, ensure they can only update their own expenses
    if (req.user.role === 'employee') {
      // Populate employeeId if not already populated
      if (!expense.employeeId._id) {
        await expense.populate('employeeId', '_id');
      }
      const expenseEmployeeId = expense.employeeId._id 
        ? expense.employeeId._id.toString() 
        : expense.employeeId.toString();
      
      if (expenseEmployeeId !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only update your own expenses' 
        });
      }

      // Employees can only update expenses in draft or rejected status
      if (!['draft', 'rejected'].includes(expense.status)) {
        return res.status(403).json({ 
          message: 'You can only update expenses that are in draft or rejected status' 
        });
      }
    }

    // Update expense
    const updatedExpense = await DailyExpense.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        lastModifiedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'createdBy', select: 'username' },
      { path: 'lastModifiedBy', select: 'username' },
      { path: 'approvedBy', select: 'username' }
    ]);

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id/submit
// @desc    Submit expense for approval
// @access  Private (All roles - employees can submit their own)
router.put('/:id/submit', [auth, allRoles], async (req, res) => {
  try {
    const expense = await DailyExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // If user is an employee, ensure they can only submit their own expenses
    if (req.user.role === 'employee') {
      if (!expense.employeeId._id) {
        await expense.populate('employeeId', '_id');
      }
      const expenseEmployeeId = expense.employeeId._id 
        ? expense.employeeId._id.toString() 
        : expense.employeeId.toString();
      
      if (expenseEmployeeId !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only submit your own expenses' 
        });
      }
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Only draft expenses can be submitted' 
      });
    }

    expense.status = 'submitted';
    expense.lastModifiedBy = req.user.id;
    await expense.save();

    await expense.populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'lastModifiedBy', select: 'username' }
    ]);

    res.json({
      message: 'Expense submitted successfully',
      expense
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id/approve
// @desc    Approve expense (Admin/Manager only)
// @access  Private (Admin/Manager)
router.put('/:id/approve', [auth, adminOrManager], async (req, res) => {
  try {
    const expense = await DailyExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (!['submitted', 'rejected'].includes(expense.status)) {
      return res.status(400).json({ 
        message: 'Only submitted or rejected expenses can be approved' 
      });
    }

    expense.status = 'approved';
    expense.approvedBy = req.user.id;
    expense.approvedAt = new Date();
    expense.lastModifiedBy = req.user.id;
    await expense.save();

    await expense.populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'approvedBy', select: 'username' }
    ]);

    res.json({
      message: 'Expense approved successfully',
      expense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id/reject
// @desc    Reject expense (Admin/Manager only)
// @access  Private (Admin/Manager)
router.put('/:id/reject', [
  auth,
  adminOrManager,
  body('rejectionReason').optional().isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await DailyExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (!['submitted', 'approved'].includes(expense.status)) {
      return res.status(400).json({ 
        message: 'Only submitted or approved expenses can be rejected' 
      });
    }

    expense.status = 'rejected';
    expense.rejectionReason = req.body.rejectionReason || '';
    expense.lastModifiedBy = req.user.id;
    await expense.save();

    await expense.populate([
      { path: 'employeeId', select: 'name employeeId position' },
      { path: 'lastModifiedBy', select: 'username' }
    ]);

    res.json({
      message: 'Expense rejected successfully',
      expense
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense entry
// @access  Private (All roles - employees can delete their own draft expenses)
router.delete('/:id', [auth, allRoles], async (req, res) => {
  try {
    const expense = await DailyExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // If user is an employee, ensure they can only delete their own expenses
    if (req.user.role === 'employee') {
      if (!expense.employeeId._id) {
        await expense.populate('employeeId', '_id');
      }
      const expenseEmployeeId = expense.employeeId._id 
        ? expense.employeeId._id.toString() 
        : expense.employeeId.toString();
      
      if (expenseEmployeeId !== req.user.linkedEmployeeId.toString()) {
        return res.status(403).json({ 
          message: 'You can only delete your own expenses' 
        });
      }

      // Employees can only delete draft expenses
      if (expense.status !== 'draft') {
        return res.status(403).json({ 
          message: 'You can only delete draft expenses' 
        });
      }
    }

    await DailyExpense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

