import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeesAPI, timesheetsAPI, reportsAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    recentTimesheets: [],
    monthlySummary: null,
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Load different data based on user role
      if (user.role === 'admin' || user.role === 'manager') {
        // Load employees count
        const employeesResponse = await employeesAPI.getEmployees({ limit: 1 });
        setStats(prev => ({
          ...prev,
          totalEmployees: employeesResponse.data.total,
        }));

        // Load recent timesheets
        const timesheetsResponse = await timesheetsAPI.getTimesheets({ 
          limit: 5,
          page: 1 
        });
        setStats(prev => ({
          ...prev,
          recentTimesheets: timesheetsResponse.data.timesheets,
        }));
      } else if (user.role === 'employee') {
        // Load employee's recent timesheets
        const timesheetsResponse = await timesheetsAPI.getTimesheets({ 
          limit: 5,
          page: 1 
        });
        setStats(prev => ({
          ...prev,
          recentTimesheets: timesheetsResponse.data.timesheets,
        }));

        // Load current month summary
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        try {
          const summaryResponse = await reportsAPI.getMonthlySummary(
            user.linkedEmployeeId, 
            year, 
            month
          );
          setStats(prev => ({
            ...prev,
            monthlySummary: summaryResponse.data,
          }));
        } catch (error) {
          // Summary might not exist yet
          console.log('No monthly summary found');
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.role, user.linkedEmployeeId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getRoleBasedTitle = () => {
    switch (user.role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'manager':
        return 'Manager Dashboard';
      case 'employee':
        return 'My Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getRoleBasedDescription = () => {
    switch (user.role) {
      case 'admin':
        return 'Manage employees, timesheets, and generate reports';
      case 'manager':
        return 'View team timesheets and generate reports';
      case 'employee':
        return 'View your timesheets and work summary';
      default:
        return 'Welcome to Labor Grid';
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{getRoleBasedTitle()}</h1>
        <p>{getRoleBasedDescription()}</p>
      </div>

      <div className="dashboard-content">
        {/* Stats Cards */}
        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>{stats.totalEmployees}</h3>
                <p>Total Employees</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>{stats.recentTimesheets.length}</h3>
                <p>Recent Entries</p>
              </div>
            </div>
          </div>
        )}

        {/* Employee Monthly Summary */}
        {user.role === 'employee' && stats.monthlySummary && (
          <div className="monthly-summary">
            <h2>This Month's Summary</h2>
            <div className="summary-cards">
              <div className="summary-card">
                <h3>{stats.monthlySummary.totalRegularHours.toFixed(1)}</h3>
                <p>Regular Hours</p>
              </div>
              <div className="summary-card">
                <h3>{stats.monthlySummary.totalOTHours.toFixed(1)}</h3>
                <p>OT Hours</p>
              </div>
              <div className="summary-card">
                <h3>${stats.monthlySummary.totalPayableAmount.toFixed(2)}</h3>
                <p>Total Payable</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Timesheets */}
        <div className="recent-timesheets">
          <h2>Recent Timesheets</h2>
          {stats.recentTimesheets.length > 0 ? (
            <div className="timesheet-list">
              {stats.recentTimesheets.map((timesheet) => (
                <div key={timesheet._id} className="timesheet-item">
                  <div className="timesheet-info">
                    <h4>{timesheet.employeeId?.name || 'Unknown Employee'}</h4>
                    <p>{formatDate(timesheet.date)}</p>
                  </div>
                  <div className="timesheet-details">
                    <span className="time-range">
                      {formatTime(timesheet.startTime)} - {formatTime(timesheet.endTime)}
                    </span>
                    <span className="total-hours">
                      {timesheet.totalHoursWorked.toFixed(1)}h
                    </span>
                    {timesheet.otHours > 0 && (
                      <span className="ot-hours">
                        +{timesheet.otHours.toFixed(1)}h OT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No recent timesheets found</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            {(user.role === 'admin' || user.role === 'manager') && (
              <>
                <button 
                  className="action-btn primary"
                  onClick={() => navigate('/timesheets')}
                >
                  Add Timesheet Entry
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => navigate('/timesheets')}
                >
                  View All Timesheets
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => navigate('/reports')}
                >
                  Generate Reports
                </button>
              </>
            )}
            {user.role === 'admin' && (
              <button 
                className="action-btn secondary"
                onClick={() => navigate('/employees')}
              >
                Manage Employees
              </button>
            )}
            {user.role === 'employee' && (
              <button 
                className="action-btn primary"
                onClick={() => navigate('/timesheets')}
              >
                View My Timesheets
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
