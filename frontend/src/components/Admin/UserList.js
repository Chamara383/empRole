import React, { useState, useEffect, useCallback } from 'react';
import { userManagementAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './UserList.css';

const UserList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'employee',
    linkedEmployeeId: '',
    isActive: true
  });

  // Load users
  const loadUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: searchTerm || undefined,
        role: roleFilter || undefined
      };
      
      const response = await userManagementAPI.getUsers(params);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'employee',
      linkedEmployeeId: '',
      isActive: true
    });
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
      linkedEmployeeId: user.linkedEmployeeId || '',
      isActive: user.isActive
    });
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'employee',
      linkedEmployeeId: '',
      isActive: true
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const userData = { ...formData };
      
      // Remove empty password for updates
      if (editingUser && !userData.password) {
        delete userData.password;
      }

      // Remove linkedEmployeeId if not employee role
      if (userData.role !== 'employee') {
        delete userData.linkedEmployeeId;
      }

      if (editingUser) {
        await userManagementAPI.updateUser(editingUser._id, userData);
        setMessage('User updated successfully');
      } else {
        await userManagementAPI.createUser(userData);
        setMessage('User created successfully');
      }

      handleFormClose();
      loadUsers(pagination.currentPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await userManagementAPI.deleteUser(user._id);
      setMessage(`User "${user.username}" deleted successfully`);
      loadUsers(pagination.currentPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} user "${user.username}"?`)) {
      return;
    }

    try {
      await userManagementAPI.toggleUserStatus(user._id);
      setMessage(`User "${user.username}" ${action}d successfully`);
      loadUsers(pagination.currentPage);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user`);
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

  const getRoleBadgeClass = (role) => {
    const classMap = {
      admin: 'role-badge admin',
      manager: 'role-badge manager',
      employee: 'role-badge employee'
    };
    return classMap[role] || 'role-badge';
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && users.length === 0) {
    return (
      <div className="user-list">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-list">
      <div className="user-header">
        <h1>User Management</h1>
        <button className="add-button" onClick={handleAddUser}>
          + Add User
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="role-filter">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td className="user-employee-id">
                  {user.linkedEmployeeId ? (
                    <div className="employee-info">
                      <span className="employee-id">{user.linkedEmployeeId.employeeId}</span>
                      <span className="employee-name">{user.linkedEmployeeId.name}</span>
                    </div>
                  ) : (
                    <span className="no-employee">-</span>
                  )}
                </td>
                <td className="user-username">{user.username}</td>
                <td className="user-email">{user.email}</td>
                <td className="user-role">
                  <span className={getRoleBadgeClass(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </td>
                <td className="user-status">
                  {getStatusBadge(user.isActive)}
                </td>
                <td className="user-created">{formatDate(user.createdAt)}</td>
                <td className="user-last-login">
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </td>
                <td className="user-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditUser(user)}
                    title="Edit User"
                  >
                    ✏️
                  </button>
                  <button
                    className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                    onClick={() => handleToggleStatus(user)}
                    title={user.isActive ? 'Deactivate User' : 'Activate User'}
                    disabled={user._id === currentUser.id}
                  >
                    {user.isActive ? '⏸️' : '▶️'}
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteUser(user)}
                    title="Delete User"
                    disabled={user._id === currentUser.id}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !loading && (
          <div className="no-data">
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => loadUsers(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="page-btn"
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.currentPage} of {pagination.totalPages} 
            ({pagination.totalUsers} total)
          </span>
          <button
            onClick={() => loadUsers(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="close-btn" onClick={handleFormClose}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password {editingUser ? '(leave empty to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {formData.role === 'employee' && (
                <div className="form-group">
                  <label htmlFor="linkedEmployeeId">Employee ID</label>
                  <input
                    type="text"
                    id="linkedEmployeeId"
                    name="linkedEmployeeId"
                    value={formData.linkedEmployeeId}
                    onChange={handleInputChange}
                    placeholder="Enter employee ID"
                  />
                </div>
              )}

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active User
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleFormClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
