import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { FaqPage } from './pages/FaqPage';
import { ContactPage } from './pages/ContactPage';
import { DataDeletionPage } from './pages/DataDeletionPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountsPage } from './pages/AccountsPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { DraftsPage } from './pages/DraftsPage';
import { PostsPage } from './pages/PostsPage';
import { ScheduledPostsPage } from './pages/ScheduledPostsPage';
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
import { AdminManagementPage } from './pages/admin/AdminManagementPage';
import { AdminPromotionsPage } from './pages/admin/AdminPromotionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AcceptAdminInvitePage } from './pages/admin/AcceptAdminInvitePage';

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
      <Route path="/data-deletion" element={<DataDeletionPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin Public Gateway & Invitation Flow */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/accept-invite" element={<AcceptAdminInvitePage />} />

      {/* Protected SaaS App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/create-post" element={<CreatePostPage />} />
        <Route path="/drafts" element={<DraftsPage />} />
        <Route path="/dashboard" element={<Navigate to="/create-post" replace />} />
        <Route path="/app" element={<Navigate to="/create-post" replace />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/scheduled" element={<ScheduledPostsPage />} />
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
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="dashboard" element={<Navigate to="/admin/users" replace />} />
        <Route path="administrators" element={<AdminManagementPage />} />
        <Route path="promotions" element={<Navigate to="/admin/plans" replace />} />
        <Route path="promotions/manage" element={<AdminPromotionsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="operations" element={<Navigate to="/admin/users" replace />} />
        <Route path="health" element={<Navigate to="/admin/users" replace />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
      </Route>

      {/* Default fallback redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
