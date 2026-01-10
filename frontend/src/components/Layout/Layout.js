import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠', roles: ['admin', 'manager', 'employee'] },
    { name: 'Employees', href: '/employees', icon: '👥', roles: ['admin', 'manager'] },
    { name: 'User Management', href: '/user-management', icon: '👤', roles: ['admin'] },
    { name: 'Timesheets', href: '/timesheets', icon: '⏰', roles: ['admin', 'manager', 'employee'] },
    { name: 'Expenses', href: '/expenses', icon: '💰', roles: ['admin', 'manager', 'employee'] },
    { name: 'Reports', href: '/reports', icon: '📊', roles: ['admin', 'manager', 'employee'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Labor Grid</h2>
          <button 
            className="sidebar-toggle mobile-only"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="sidebar-toggle mobile-only"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="page-title">
              {filteredNavigation.find(item => isActive(item.href))?.name || 'Dashboard'}
            </h1>
          </div>
          
          <div className="topbar-right">
            <button 
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            
            <div className="user-menu" ref={userMenuRef}>
              <button 
                className="user-info-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  <span>{user?.username?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.username}</span>
                  <span className="user-role">{user?.role}</span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {userMenuOpen && (
                <div className="user-dropdown">
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span className="dropdown-icon">👤</span>
                    Profile & Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
