import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useAuth();

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


      <div className="profile-content">
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

            <div className="info-card password-assistance">
              <h3>Password Assistance</h3>
              <p>For password changes or resets, please contact your administrator.</p>
            </div>
          </div>
      </div>
    </div>
  );
};

export default UserProfile;
