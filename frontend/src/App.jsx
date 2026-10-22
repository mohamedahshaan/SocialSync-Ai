import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { FaqPage } from './pages/FaqPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountsPage } from './pages/AccountsPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostsPage } from './pages/PostsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PackagesPage } from './pages/PackagesPage';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Admin imports
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminPlansPage } from './pages/admin/AdminPlansPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';

export function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/pricing" element={<Navigate to="/" replace />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin Public Gateway */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected SaaS App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/create-post" element={<CreatePostPage />} />
        <Route path="/dashboard" element={<Navigate to="/create-post" replace />} />
        <Route path="/app" element={<Navigate to="/create-post" replace />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/my-plan" element={<Navigate to="/settings?tab=subscription" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Secure Admin Console Routes */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
      </Route>

      {/* Default fallback redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

