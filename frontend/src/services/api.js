import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Password Reset API (Admin only - individual password reset removed)
export const passwordResetAPI = {
  requestReset: (email) => api.post('/password-reset/request', { email }),
  verifyToken: (token) => api.post('/password-reset/verify', { token }),
  resetPassword: (token, newPassword) => 
    api.post('/password-reset/reset', { token, newPassword }),
};


// Employees API
export const employeesAPI = {
  getEmployees: (params) => api.get('/employees', { params }),
  getEmployee: (id) => api.get(`/employees/${id}`),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deactivateEmployee: (id) => api.put(`/employees/${id}/deactivate`),
  activateEmployee: (id) => api.put(`/employees/${id}/activate`),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
};

// Timesheets API
export const timesheetsAPI = {
  getTimesheets: (params) => api.get('/timesheets', { params }),
  getTimesheet: (id) => api.get(`/timesheets/${id}`),
  getEmployeeTimesheets: (employeeId, params) => 
    api.get(`/timesheets/employee/${employeeId}`, { params }),
  createTimesheet: (data) => api.post('/timesheets', data),
  updateTimesheet: (id, data) => api.put(`/timesheets/${id}`, data),
  deleteTimesheet: (id) => api.delete(`/timesheets/${id}`),
};

// Reports API
export const reportsAPI = {
  getMonthlySummary: (employeeId, year, month) => 
    api.get(`/reports/monthly/${employeeId}/${year}/${month}`),
  getMonthlySummaries: (params) => api.get('/reports/monthly', { params }),
  generateMonthlySummaries: (year, month) => 
    api.post(`/reports/generate/${year}/${month}`),
  finalizeSummary: (id) => api.put(`/reports/monthly/${id}/finalize`),
  exportReport: (year, month) => 
    api.get(`/reports/export/${year}/${month}`, { responseType: 'blob' }),
};


// User Management API
export const userManagementAPI = {
  getUsers: (params) => api.get('/user-management/users', { params }),
  getUser: (id) => api.get(`/user-management/users/${id}`),
  createUser: (data) => api.post('/user-management/users', data),
  updateUser: (id, data) => api.put(`/user-management/users/${id}`, data),
  deleteUser: (id) => api.delete(`/user-management/users/${id}`),
  toggleUserStatus: (id) => api.put(`/user-management/users/${id}/toggle-status`),
};

export default api;
