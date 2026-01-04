import React, { useState, useEffect } from 'react';
import { expensesAPI, employeesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ExpenseForm from './ExpenseForm';
import './ExpenseList.css';

const ExpenseList = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    status: '',
    category: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  const loadExpenses = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await expensesAPI.getExpenses(params);
      setExpenses(response.data.expenses);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total,
      }));
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.status === 404 
                            ? 'Expenses API not found. Please restart the backend server.' 
                            : 'Failed to load expenses';
      setError(errorMessage);
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters]);

  // Initialize filters based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'employee' && user.linkedEmployeeId) {
        // For employees, automatically filter to their own expenses
        setFilters(prev => ({
          ...prev,
          employeeId: user.linkedEmployeeId,
        }));
      }
    }
  }, [user]);

  useEffect(() => {
    loadEmployees();
    loadExpenses();
  }, [loadExpenses]);

  const loadEmployees = async () => {
    // Only load employees list for admin/manager (employees don't have access to this API)
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      try {
        const response = await employeesAPI.getEmployees({ limit: 1000 });
        setEmployees(response.data.employees);
      } catch (err) {
        console.error('Error loading employees:', err);
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleEmployeeClick = (employeeId) => {
    // Only allow clicking employee names for admin/manager roles
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      setFilters(prev => ({
        ...prev,
        employeeId: employeeId,
      }));
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExpense(null);
    loadExpenses();
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) {
      return;
    }

    try {
      await expensesAPI.deleteExpense(expenseId);
      loadExpenses();
    } catch (err) {
      setError('Failed to delete expense');
      console.error('Error deleting expense:', err);
    }
  };

  const handleSubmitExpense = async (expenseId) => {
    try {
      await expensesAPI.submitExpense(expenseId);
      loadExpenses();
    } catch (err) {
      setError('Failed to submit expense');
      console.error('Error submitting expense:', err);
    }
  };

  const handleApproveExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to approve this expense?')) {
      return;
    }

    try {
      await expensesAPI.approveExpense(expenseId);
      loadExpenses();
    } catch (err) {
      setError('Failed to approve expense');
      console.error('Error approving expense:', err);
    }
  };

  const handleRejectExpense = async (expenseId) => {
    const rejectionReason = window.prompt('Please provide a reason for rejection:');
    if (rejectionReason === null) return; // User cancelled

    try {
      await expensesAPI.rejectExpense(expenseId, rejectionReason);
      loadExpenses();
    } catch (err) {
      setError('Failed to reject expense');
      console.error('Error rejecting expense:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount, currency = 'LKR') => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      approved: 'status-approved',
      rejected: 'status-rejected',
      reimbursed: 'status-reimbursed',
    };
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-draft'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const categoryClasses = {
      transport: 'category-transport',
      meals: 'category-meals',
      accommodation: 'category-accommodation',
      supplies: 'category-supplies',
      other: 'category-other',
    };
    return (
      <span className={`category-badge ${categoryClasses[category] || 'category-other'}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return 'Unknown Employee';
    // Handle both populated and non-populated employeeId
    const id = typeof employeeId === 'object' ? employeeId._id : employeeId;
    const employee = employees.find(emp => emp._id === id);
    return employee ? employee.name : 'Unknown Employee';
  };

  const getEmployeeId = (employeeId) => {
    if (!employeeId) return null;
    // Handle both populated and non-populated employeeId
    return typeof employeeId === 'object' ? employeeId._id : employeeId;
  };

  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');

  if (loading && expenses.length === 0) {
    return (
      <div className="expense-list">
        <div className="loading">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <div className="expense-header">
        <h1>Daily Expenses Management</h1>
        <button className="add-button" onClick={handleAddExpense}>
          + Add Expense Entry
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        {isAdminOrManager && (
          <div className="filter-group">
            <label htmlFor="employeeId">Employee</label>
            <select
              id="employeeId"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Employees</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="transport">Transport</option>
            <option value="meals">Meals</option>
            <option value="accommodation">Accommodation</option>
            <option value="supplies">Supplies</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="reimbursed">Reimbursed</option>
          </select>
        </div>
      </div>

      {/* Expense Table */}
      <div className="expense-table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense._id}>
                <td className="expense-date" data-label="Date">{formatDate(expense.date)}</td>
                <td className="expense-employee" data-label="Employee">
                  {isAdminOrManager ? (
                    <button
                      type="button"
                      className="employee-name-link"
                      onClick={() => handleEmployeeClick(getEmployeeId(expense.employeeId))}
                      title="Click to filter by this employee"
                    >
                      {getEmployeeName(expense.employeeId)}
                    </button>
                  ) : (
                    <span>{getEmployeeName(expense.employeeId)}</span>
                  )}
                </td>
                <td className="expense-category" data-label="Category">
                  {getCategoryBadge(expense.category)}
                </td>
                <td className="expense-description" data-label="Description">
                  {expense.description}
                </td>
                <td className="expense-amount" data-label="Amount">
                  {formatCurrency(expense.amount, expense.currency)}
                </td>
                <td className="expense-status" data-label="Status">
                  {getStatusBadge(expense.status)}
                </td>
                <td className="expense-actions" data-label="Actions">
                  {expense.status === 'draft' && (
                    <>
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditExpense(expense)}
                        title="Edit Expense"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn submit"
                        onClick={() => handleSubmitExpense(expense._id)}
                        title="Submit for Approval"
                      >
                        📤
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteExpense(expense._id)}
                        title="Delete Expense"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {expense.status === 'submitted' && isAdminOrManager && (
                    <>
                      <button
                        className="action-btn approve"
                        onClick={() => handleApproveExpense(expense._id)}
                        title="Approve Expense"
                      >
                        ✓
                      </button>
                      <button
                        className="action-btn reject"
                        onClick={() => handleRejectExpense(expense._id)}
                        title="Reject Expense"
                      >
                        ✗
                      </button>
                    </>
                  )}
                  {expense.status === 'rejected' && (
                    <button
                      className="action-btn edit"
                      onClick={() => handleEditExpense(expense)}
                      title="Edit Expense"
                    >
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {expenses.length === 0 && !loading && (
          <div className="no-data">
            <p>No expenses found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              currentPage: Math.max(1, prev.currentPage - 1) 
            }))}
            disabled={pagination.currentPage === 1}
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {pagination.currentPage} of {pagination.totalPages} 
            ({pagination.total} total)
          </span>
          
          <button
            className="page-btn"
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              currentPage: Math.min(prev.totalPages, prev.currentPage + 1) 
            }))}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          employees={employees}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default ExpenseList;
