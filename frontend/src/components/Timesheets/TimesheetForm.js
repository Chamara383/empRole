import React, { useState, useEffect } from 'react';
import { timesheetsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './TimesheetForm.css';

const TimesheetForm = ({ timesheet, employees, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: '',
    employeeId: '',
    startTime: '',
    endTime: '',
    breakTime: 0,
    isVacationWork: false,
    isHolidayWork: false,
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState({
    totalHours: 0,
    otHours: 0,
  });

  useEffect(() => {
    if (timesheet) {
      setFormData({
        date: timesheet.date ? new Date(timesheet.date).toISOString().split('T')[0] : '',
        employeeId: timesheet.employeeId?._id || timesheet.employeeId || '',
        startTime: timesheet.startTime || '',
        endTime: timesheet.endTime || '',
        breakTime: timesheet.breakTime || 0,
        isVacationWork: timesheet.isVacationWork || false,
        isHolidayWork: timesheet.isHolidayWork || false,
        notes: timesheet.notes || '',
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
  }, [timesheet, user]);

  const calculateHours = React.useCallback(() => {
    if (!formData.startTime || !formData.endTime) {
      setCalculatedHours({ totalHours: 0, otHours: 0 });
      return;
    }

    const start = parseTime(formData.startTime);
    const end = parseTime(formData.endTime);
    
    let totalMinutes = end - start;
    
    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours
    }
    
    // Subtract break time (in minutes)
    totalMinutes -= (formData.breakTime || 0);
    
    // Convert to hours
    const totalHours = Math.max(0, totalMinutes / 60);
    
    // Calculate OT (assuming 8 hours is regular, configurable later)
    const regularHours = 8;
    const otHours = Math.max(0, totalHours - regularHours);
    
    setCalculatedHours({ totalHours, otHours });
  }, [formData.startTime, formData.endTime, formData.breakTime]);

  useEffect(() => {
    calculateHours();
  }, [calculateHours]);

  const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

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

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = parseTime(formData.startTime);
      const end = parseTime(formData.endTime);
      
      if (start === end) {
        newErrors.endTime = 'End time must be different from start time';
      }
    }

    if (formData.breakTime < 0) {
      newErrors.breakTime = 'Break time cannot be negative';
    }

    if (formData.breakTime > 480) {
      newErrors.breakTime = 'Break time cannot exceed 8 hours';
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
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
        breakTime: parseInt(formData.breakTime) || 0,
      };

      if (timesheet) {
        await timesheetsAPI.updateTimesheet(timesheet._id, submitData);
      } else {
        await timesheetsAPI.createTimesheet(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving timesheet:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to save timesheet. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{timesheet ? 'Edit Timesheet Entry' : 'Add Timesheet Entry'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
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
                      timesheet?.employeeId?.name || 
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
            <h3>Time Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Start Time *</label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className={errors.startTime ? 'error' : ''}
                />
                {errors.startTime && <span className="field-error">{errors.startTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time *</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={errors.endTime ? 'error' : ''}
                />
                {errors.endTime && <span className="field-error">{errors.endTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="breakTime">Break Time (minutes)</label>
                <input
                  type="number"
                  id="breakTime"
                  name="breakTime"
                  value={formData.breakTime}
                  onChange={handleChange}
                  className={errors.breakTime ? 'error' : ''}
                  min="0"
                  max="480"
                  placeholder="0"
                />
                {errors.breakTime && <span className="field-error">{errors.breakTime}</span>}
              </div>
            </div>

            {/* Calculated Hours Display */}
            {calculatedHours.totalHours > 0 && (
              <div className="calculated-hours">
                <div className="hours-display">
                  <div className="hours-item">
                    <span className="hours-label">Total Hours:</span>
                    <span className="hours-value">{calculatedHours.totalHours.toFixed(1)}h</span>
                  </div>
                  <div className="hours-item">
                    <span className="hours-label">OT Hours:</span>
                    <span className="hours-value ot">{calculatedHours.otHours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Work Type</h3>
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isVacationWork"
                    checked={formData.isVacationWork}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  Vacation Work
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isHolidayWork"
                    checked={formData.isHolidayWork}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  Holiday Work
                </label>
              </div>
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
                placeholder="Additional notes about this timesheet entry..."
                rows="3"
                maxLength="500"
              />
              {errors.notes && <span className="field-error">{errors.notes}</span>}
              <div className="char-count">
                {formData.notes.length}/500 characters
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : (timesheet ? 'Update Timesheet' : 'Add Timesheet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetForm;
