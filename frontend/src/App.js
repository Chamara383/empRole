import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import UserProfile from './components/Profile/UserProfile';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Dashboard/Dashboard';
import EmployeeList from './components/Employees/EmployeeList';
import TimesheetList from './components/Timesheets/TimesheetList';
import MonthlyReports from './components/Reports/MonthlyReports';
import UserList from './components/Admin/UserList';
import Layout from './components/Layout/Layout';
import './App.css';

// Unauthorized component
const Unauthorized = () => (
  <div className="unauthorized">
    <h1>Access Denied</h1>
    <p>You don't have permission to access this page.</p>
  </div>
);

// Main App Routes
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Layout>
              <UserProfile />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employees" 
        element={
          <ProtectedRoute requiredRole={["admin", "manager"]}>
            <Layout>
              <EmployeeList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/timesheets" 
        element={
          <ProtectedRoute>
            <Layout>
              <TimesheetList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <Layout>
              <MonthlyReports />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-management" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <UserList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/unauthorized" 
        element={<Unauthorized />} 
      />
      <Route 
        path="*" 
        element={<Navigate to="/dashboard" replace />} 
      />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;