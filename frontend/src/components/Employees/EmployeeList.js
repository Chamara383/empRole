import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../../services/api';
import EmployeeForm from './EmployeeForm';
import './EmployeeList.css';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  const loadEmployees = React.useCallback(async () => {
    try {
      const response = await employeesAPI.getEmployees({ limit: 1000 });
      setEmployees(response.data.employees);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const loadEmployeesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      };

      const response = await employeesAPI.getEmployees(params);
      setEmployees(response.data.employees);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total,
      }));
    } catch (err) {
      setError('Failed to load employees');
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEmployee(null);
    loadEmployeesData();
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      await employeesAPI.deleteEmployee(employeeId);
      loadEmployeesData();
    } catch (err) {
      setError('Failed to deactivate employee');
      console.error('Error deleting employee:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-active',
      inactive: 'status-inactive',
      terminated: 'status-terminated',
    };
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-inactive'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <div className="employee-list">
        <div className="loading">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="employee-list">
      <div className="employee-header">
        <h1>Employee Management</h1>
        <button className="add-button" onClick={handleAddEmployee}>
          + Add Employee
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="employee-table-container">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Position</th>
              <th>Pay Rate</th>
              <th>Status</th>
              <th>Date Hired</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee._id}>
                <td className="employee-id">{employee.employeeId}</td>
                <td className="employee-name">{employee.name}</td>
                <td className="employee-position">{employee.position}</td>
                <td className="employee-pay">{formatCurrency(employee.payRate)}</td>
                <td className="employee-status">
                  {getStatusBadge(employee.status)}
                </td>
                <td className="employee-date">{formatDate(employee.dateOfEmployment)}</td>
                <td className="employee-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditEmployee(employee)}
                    title="Edit Employee"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteEmployee(employee._id)}
                    title="Deactivate Employee"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && !loading && (
          <div className="no-data">
            <p>No employees found</p>
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

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeList;
