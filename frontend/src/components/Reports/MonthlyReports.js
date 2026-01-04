import React, { useState, useEffect } from 'react';
import { reportsAPI, employeesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './MonthlyReports.css';

const MonthlyReports = () => {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    employeeId: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });
  const [generating, setGenerating] = useState(false);

  const loadReports = React.useCallback(async () => {
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

      const response = await reportsAPI.getMonthlySummaries(params);
      setReports(response.data.summaries);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total,
      }));
    } catch (err) {
      setError('Failed to load monthly reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters]);

  useEffect(() => {
    loadEmployees();
    loadReports();
  }, [loadReports]);

  const loadEmployees = async () => {
    try {
      const response = await employeesAPI.getEmployees({ limit: 1000 });
      setEmployees(response.data.employees);
    } catch (err) {
      console.error('Error loading employees:', err);
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

  const handleGenerateReports = async () => {
    try {
      setGenerating(true);
      await reportsAPI.generateMonthlySummaries(filters.year, filters.month);
      loadReports();
    } catch (err) {
      setError('Failed to generate reports');
      console.error('Error generating reports:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalizeReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to finalize this report? This action cannot be undone.')) {
      return;
    }

    try {
      await reportsAPI.finalizeSummary(reportId);
      loadReports();
    } catch (err) {
      setError('Failed to finalize report');
      console.error('Error finalizing report:', err);
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await reportsAPI.exportReport(filters.year, filters.month);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-report-${filters.year}-${filters.month}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export report');
      console.error('Error exporting report:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
    }).format(amount);
  };


  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      finalized: 'status-finalized',
      paid: 'status-paid',
    };
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-draft'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  };

  if (loading && reports.length === 0) {
    return (
      <div className="monthly-reports">
        <div className="loading">Loading monthly reports...</div>
      </div>
    );
  }

  return (
    <div className="monthly-reports">
      <div className="reports-header">
        <h1>Monthly Reports</h1>
        <div className="header-actions">
          <button 
            className="generate-btn" 
            onClick={handleGenerateReports}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Reports'}
          </button>
          <button 
            className="export-btn" 
            onClick={handleExportReport}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="year">Year</label>
          <select
            id="year"
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            className="filter-select"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month">Month</label>
          <select
            id="month"
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="filter-select"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
        </div>

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
            <option value="finalized">Finalized</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Report Summary */}
      <div className="report-summary">
        <h2>
          {getMonthName(filters.month)} {filters.year} - Monthly Summary
        </h2>
        <p>
          Showing {reports.length} of {pagination.total} reports
        </p>
      </div>

      {/* Reports Table */}
      <div className="reports-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Regular Hours</th>
              <th>OT Hours</th>
              <th>Vacation Hours</th>
              <th>Holiday Hours</th>
              <th>Total Payable</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id}>
                <td className="report-employee" data-label="Employee">
                  {getEmployeeName(report.employeeId?._id)}
                </td>
                <td className="report-hours" data-label="Regular Hours">
                  {report.totalRegularHours.toFixed(1)}h
                </td>
                <td className="report-ot" data-label="OT Hours">
                  {report.totalOTHours.toFixed(1)}h
                </td>
                <td className="report-vacation" data-label="Vacation Hours">
                  {report.totalVacationHours.toFixed(1)}h
                </td>
                <td className="report-holiday" data-label="Holiday Hours">
                  {report.totalHolidayHours.toFixed(1)}h
                </td>
                <td className="report-payable" data-label="Total Payable">
                  {formatCurrency(report.totalPayableAmount)}
                </td>
                <td className="report-status" data-label="Status">
                  {getStatusBadge(report.status)}
                </td>
                <td className="report-actions" data-label="Actions">
                  {report.status === 'draft' && (
                    <button
                      className="action-btn finalize"
                      onClick={() => handleFinalizeReport(report._id)}
                      title="Finalize Report"
                    >
                      ✓
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reports.length === 0 && !loading && (
          <div className="no-data">
            <p>No reports found for {getMonthName(filters.month)} {filters.year}</p>
            <button 
              className="generate-btn" 
              onClick={handleGenerateReports}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Reports'}
            </button>
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
    </div>
  );
};

export default MonthlyReports;
