import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostsPage } from './pages/PostsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes enclosed in AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/create-post" element={<CreatePostPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default fallback redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
export default App;
