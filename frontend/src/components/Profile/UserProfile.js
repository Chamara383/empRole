import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { passwordResetAPI } from '../../services/api';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    try {
      await passwordResetAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage('Password has been changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: 'Administrator',
      manager: 'Manager',
      employee: 'Employee'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h1>User Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Information
        </button>
        <button 
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-info">
            <div className="info-card">
              <h3>Account Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Username</label>
                  <span>{user?.username}</span>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <span>{user?.email}</span>
                </div>
                <div className="info-item">
                  <label>Role</label>
                  <span className={`role-badge role-${user?.role}`}>
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
                <div className="info-item">
                  <label>Account Status</label>
                  <span className="status-active">Active</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>System Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Last Login</label>
                  <span>Recently</span>
                </div>
                <div className="info-item">
                  <label>Account Created</label>
                  <span>Recently</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="password-section">
            <div className="password-card">
              <h3>Change Password</h3>
              <p>Update your password to keep your account secure</p>

              <form onSubmit={handlePasswordSubmit} className="password-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Enter current password"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
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
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
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

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>

            <div className="password-tips">
              <h4>Password Tips</h4>
              <ul>
                <li>Use at least 6 characters</li>
                <li>Include a mix of letters and numbers</li>
                <li>Avoid common words or personal information</li>
                <li>Don't reuse passwords from other accounts</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
