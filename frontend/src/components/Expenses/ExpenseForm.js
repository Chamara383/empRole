import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ExpenseForm.css';

const ExpenseForm = ({ expense, employees, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: '',
    employeeId: '',
    category: 'other',
    description: '',
    amount: '',
    currency: 'LKR',
    receipt: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        employeeId: expense.employeeId?._id || expense.employeeId || '',
        category: expense.category || 'other',
        description: expense.description || '',
        amount: expense.amount || '',
        currency: expense.currency || 'LKR',
        receipt: expense.receipt || '',
        notes: expense.notes || '',
      });
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      // For employees, auto-set their employeeId
      const defaultEmployeeId = (user && user.role === 'employee' && user.linkedEmployeeId) 
        ? user.linkedEmployeeId 
        : '';
      setFormData(prev => ({ 
        ...prev, 
        date: today,
        employeeId: defaultEmployeeId,
      }));
    }
  }, [expense, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.employeeId) {
      newErrors.employeeId = 'Employee is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (expense) {
        await expensesAPI.updateExpense(expense._id, submitData);
      } else {
        await expensesAPI.createExpense(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      let errorMessage = 'Failed to save expense. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Expenses API not found. Please restart the backend server.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{expense ? 'Edit Expense Entry' : 'Add Expense Entry'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">
          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={errors.date ? 'error' : ''}
                />
                {errors.date && <span className="field-error">{errors.date}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="employeeId">Employee *</label>
                {user && user.role === 'employee' ? (
                  <input
                    type="text"
                    id="employeeId"
                    value={
                      expense?.employeeId?.name || 
                      employees.find(emp => emp._id === formData.employeeId)?.name || 
                      user.name || 
                      'Your Name'
                    }
                    className="form-input"
                    disabled
                    readOnly
                  />
                ) : (
                  <select
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    className={errors.employeeId ? 'error' : ''}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                )}
                {errors.employeeId && <span className="field-error">{errors.employeeId}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Expense Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={errors.category ? 'error' : ''}
                >
                  <option value="transport">Transport</option>
                  <option value="meals">Meals</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="supplies">Supplies</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && <span className="field-error">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount (LKR) *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={errors.amount ? 'error' : ''}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                {errors.amount && <span className="field-error">{errors.amount}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={errors.description ? 'error' : ''}
                placeholder="Brief description of the expense"
                maxLength="500"
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="receipt">Receipt URL (Optional)</label>
              <input
                type="text"
                id="receipt"
                name="receipt"
                value={formData.receipt}
                onChange={handleChange}
                placeholder="URL or path to receipt"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Additional Information</h3>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={errors.notes ? 'error' : ''}
                placeholder="Additional notes about this expense..."
                rows="3"
                maxLength="1000"
              />
              {errors.notes && <span className="field-error">{errors.notes}</span>}
              <div className="char-count">
                {formData.notes.length}/1000 characters
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;

