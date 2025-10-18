import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../../services/api';
import './EmployeeForm.css';

const EmployeeForm = ({ employee, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    position: '',
    dateOfEmployment: '',
    payRate: '',
    otRate: '',
    vacationPayRate: '',
    breakTimeConfig: {
      isPaid: false,
      duration: 0,
    },
    personalInfo: {
      email: '',
      phone: '',
      address: '',
    },
    passwordResetInfo: {
      dateOfBirth: '',
    },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeId: employee.employeeId || '',
        name: employee.name || '',
        position: employee.position || '',
        dateOfEmployment: employee.dateOfEmployment 
          ? new Date(employee.dateOfEmployment).toISOString().split('T')[0]
          : '',
        payRate: employee.payRate || '',
        otRate: employee.otRate || '',
        vacationPayRate: employee.vacationPayRate || '',
        breakTimeConfig: {
          isPaid: employee.breakTimeConfig?.isPaid || false,
          duration: employee.breakTimeConfig?.duration || 0,
        },
        personalInfo: {
          email: employee.personalInfo?.email || '',
          phone: employee.personalInfo?.phone || '',
          address: employee.personalInfo?.address || '',
        },
        passwordResetInfo: {
          dateOfBirth: employee.passwordResetInfo?.dateOfBirth 
            ? new Date(employee.passwordResetInfo.dateOfBirth).toISOString().split('T')[0]
            : '',
        },
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

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

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.payRate || isNaN(formData.payRate) || parseFloat(formData.payRate) < 0) {
      newErrors.payRate = 'Valid pay rate is required';
    }

    if (!formData.otRate || isNaN(formData.otRate) || parseFloat(formData.otRate) < 0) {
      newErrors.otRate = 'Valid OT rate is required';
    }

    if (!formData.vacationPayRate || isNaN(formData.vacationPayRate) || parseFloat(formData.vacationPayRate) < 0) {
      newErrors.vacationPayRate = 'Valid vacation pay rate is required';
    }

    if (formData.breakTimeConfig.duration < 0) {
      newErrors.breakDuration = 'Break duration cannot be negative';
    }

    if (formData.personalInfo.email && !/\S+@\S+\.\S+/.test(formData.personalInfo.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.passwordResetInfo.dateOfBirth) {
      const dob = new Date(formData.passwordResetInfo.dateOfBirth);
      const today = new Date();
      if (dob >= today) {
        newErrors.dateOfBirth = 'Date of birth must be in the past';
      }
      if (dob.getFullYear() < 1900) {
        newErrors.dateOfBirth = 'Date of birth must be after 1900';
      }
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
        payRate: parseFloat(formData.payRate),
        otRate: parseFloat(formData.otRate),
        vacationPayRate: parseFloat(formData.vacationPayRate),
        breakTimeConfig: {
          ...formData.breakTimeConfig,
          duration: parseInt(formData.breakTimeConfig.duration) || 0,
        },
        dateOfEmployment: formData.dateOfEmployment || new Date().toISOString(),
      };

      if (employee) {
        await employeesAPI.updateEmployee(employee._id, submitData);
      } else {
        await employeesAPI.createEmployee(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      setErrors({ submit: 'Failed to save employee. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="employeeId">Employee ID *</label>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  className={errors.employeeId ? 'error' : ''}
                  placeholder="e.g., EMP001"
                />
                {errors.employeeId && <span className="field-error">{errors.employeeId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Employee full name"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="position">Position *</label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={errors.position ? 'error' : ''}
                  placeholder="Job title/position"
                />
                {errors.position && <span className="field-error">{errors.position}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfEmployment">Date of Employment</label>
                <input
                  type="date"
                  id="dateOfEmployment"
                  name="dateOfEmployment"
                  value={formData.dateOfEmployment}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Pay Rates</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="payRate">Regular Pay Rate ($/hour) *</label>
                <input
                  type="number"
                  id="payRate"
                  name="payRate"
                  value={formData.payRate}
                  onChange={handleChange}
                  className={errors.payRate ? 'error' : ''}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                {errors.payRate && <span className="field-error">{errors.payRate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="otRate">Overtime Rate ($/hour) *</label>
                <input
                  type="number"
                  id="otRate"
                  name="otRate"
                  value={formData.otRate}
                  onChange={handleChange}
                  className={errors.otRate ? 'error' : ''}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                {errors.otRate && <span className="field-error">{errors.otRate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="vacationPayRate">Vacation Pay Rate ($/hour) *</label>
                <input
                  type="number"
                  id="vacationPayRate"
                  name="vacationPayRate"
                  value={formData.vacationPayRate}
                  onChange={handleChange}
                  className={errors.vacationPayRate ? 'error' : ''}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                {errors.vacationPayRate && <span className="field-error">{errors.vacationPayRate}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Break Configuration</h3>
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="breakTimeConfig.isPaid"
                    checked={formData.breakTimeConfig.isPaid}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  Paid Break Time
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="breakDuration">Break Duration (minutes)</label>
                <input
                  type="number"
                  id="breakDuration"
                  name="breakTimeConfig.duration"
                  value={formData.breakTimeConfig.duration}
                  onChange={handleChange}
                  className={errors.breakDuration ? 'error' : ''}
                  min="0"
                  max="480"
                  placeholder="0"
                />
                {errors.breakDuration && <span className="field-error">{errors.breakDuration}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Personal Information (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="personalInfo.email"
                  value={formData.personalInfo.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="employee@company.com"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="personalInfo.phone"
                  value={formData.personalInfo.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth (for password reset)</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="passwordResetInfo.dateOfBirth"
                  value={formData.passwordResetInfo.dateOfBirth}
                  onChange={handleChange}
                  className={errors.dateOfBirth ? 'error' : ''}
                />
                {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
                <small className="field-help">Required for employee password reset functionality</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="personalInfo.address"
                value={formData.personalInfo.address}
                onChange={handleChange}
                placeholder="Street address, City, State, ZIP"
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : (employee ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
