import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { employeePasswordResetAPI } from '../../services/api';
import './Auth.css';

const EmployeePasswordReset = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    dateOfBirth: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Verify, 2: Reset
  const [verifiedEmployee, setVerifiedEmployee] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await employeePasswordResetAPI.verifyEmployee(
        formData.employeeId,
        formData.dateOfBirth
      );

      setVerifiedEmployee(response.data.employee);
      setMessage('Employee verification successful! You can now set a new password.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await employeePasswordResetAPI.resetEmployeePassword(
        formData.employeeId,
        formData.dateOfBirth,
        formData.newPassword
      );

      setMessage('Password has been reset successfully! You can now login with your new password.');
      
      // Reset form and go back to step 1
      setTimeout(() => {
        setFormData({
          employeeId: '',
          dateOfBirth: '',
          newPassword: '',
          confirmPassword: ''
        });
        setStep(1);
        setVerifiedEmployee(null);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToStep1 = () => {
    setStep(1);
    setVerifiedEmployee(null);
    setError('');
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Employee Password Reset</h2>
          <p>
            {step === 1 
              ? 'Enter your employee ID and date of birth to verify your identity'
              : 'Set a new password for your account'
            }
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                type="text"
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                placeholder="Enter your Employee ID"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>


            {message && (
              <div className="alert alert-success">
                {message}
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="auth-form">
            {verifiedEmployee && (
              <div className="verified-employee">
                <h4>Verified Employee</h4>
                <p><strong>Name:</strong> {verifiedEmployee.name}</p>
                <p><strong>Employee ID:</strong> {verifiedEmployee.employeeId}</p>
                <p><strong>Position:</strong> {verifiedEmployee.position}</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                placeholder="Enter new password"
                disabled={loading}
                minLength="6"
              />
              <small>Password must be at least 6 characters long</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm new password"
                disabled={loading}
                minLength="6"
              />
            </div>

            {message && (
              <div className="alert alert-success">
                {message}
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goBackToStep1}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeePasswordReset;
