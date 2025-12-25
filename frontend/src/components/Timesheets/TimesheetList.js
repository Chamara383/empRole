import React, { useState, useEffect } from 'react';
import { timesheetsAPI, employeesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TimesheetForm from './TimesheetForm';
import './TimesheetList.css';

const TimesheetList = () => {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  const loadTimesheets = React.useCallback(async () => {
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

      const response = await timesheetsAPI.getTimesheets(params);
      setTimesheets(response.data.timesheets);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total,
      }));
    } catch (err) {
      setError('Failed to load timesheets');
      console.error('Error loading timesheets:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters]);

  // Initialize filters based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'employee' && user.linkedEmployeeId) {
        // For employees, automatically filter to their own timesheets
        setFilters(prev => ({
          ...prev,
          employeeId: user.linkedEmployeeId,
        }));
      }
    }
  }, [user]);

  useEffect(() => {
    loadEmployees();
    loadTimesheets();
  }, [loadTimesheets]);

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
    // For employees, the employees array will be empty, but the form will use timesheet data or user info
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

  const handleAddTimesheet = () => {
    setEditingTimesheet(null);
    setShowForm(true);
  };

  const handleEditTimesheet = (timesheet) => {
    setEditingTimesheet(timesheet);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTimesheet(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTimesheet(null);
    loadTimesheets();
  };

  const handleDeleteTimesheet = async (timesheetId) => {
    if (!window.confirm('Are you sure you want to delete this timesheet entry?')) {
      return;
    }

    try {
      await timesheetsAPI.deleteTimesheet(timesheetId);
      loadTimesheets();
    } catch (err) {
      setError('Failed to delete timesheet');
      console.error('Error deleting timesheet:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      approved: 'status-approved',
      rejected: 'status-rejected',
    };
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-draft'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  const isEmployeeRole = user && user.role === 'employee';
  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');

  if (loading && timesheets.length === 0) {
    return (
      <div className="timesheet-list">
        <div className="loading">Loading timesheets...</div>
      </div>
    );
  }

  return (
    <div className="timesheet-list">
      <div className="timesheet-header">
        <h1>Timesheet Management</h1>
        <button className="add-button" onClick={handleAddTimesheet}>
          + Add Timesheet Entry
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
          </select>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="timesheet-table-container">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Time Range</th>
              <th>Total Hours</th>
              <th>OT Hours</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((timesheet) => (
              <tr key={timesheet._id}>
                <td className="timesheet-date">{formatDate(timesheet.date)}</td>
                <td className="timesheet-employee">
                  {isAdminOrManager ? (
                    <button
                      type="button"
                      className="employee-name-link"
                      onClick={() => handleEmployeeClick(getEmployeeId(timesheet.employeeId))}
                      title="Click to filter by this employee"
                    >
                      {getEmployeeName(timesheet.employeeId)}
                    </button>
                  ) : (
                    <span>{getEmployeeName(timesheet.employeeId)}</span>
                  )}
                </td>
                <td className="timesheet-time">
                  {formatTime(timesheet.startTime)} - {formatTime(timesheet.endTime)}
                </td>
                <td className="timesheet-hours">
                  {timesheet.totalHoursWorked.toFixed(1)}h
                </td>
                <td className="timesheet-ot">
                  {timesheet.otHours > 0 ? `+${timesheet.otHours.toFixed(1)}h` : '-'}
                </td>
                <td className="timesheet-type">
                  <div className="type-badges">
                    {timesheet.isVacationWork && (
                      <span className="type-badge vacation">Vacation</span>
                    )}
                    {timesheet.isHolidayWork && (
                      <span className="type-badge holiday">Holiday</span>
                    )}
                    {!timesheet.isVacationWork && !timesheet.isHolidayWork && (
                      <span className="type-badge regular">Regular</span>
                    )}
                  </div>
                </td>
                <td className="timesheet-status">
                  {getStatusBadge(timesheet.status)}
                </td>
                <td className="timesheet-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditTimesheet(timesheet)}
                    title="Edit Timesheet"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteTimesheet(timesheet._id)}
                    title="Delete Timesheet"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {timesheets.length === 0 && !loading && (
          <div className="no-data">
            <p>No timesheets found</p>
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

      {/* Timesheet Form Modal */}
      {showForm && (
        <TimesheetForm
          timesheet={editingTimesheet}
          employees={employees}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default TimesheetList;
