import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  UserX,
  History,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AVAILABLE_PERMISSIONS = [
  { id: 'users:read', label: 'View Users', description: 'Read user profiles and account records' },
  { id: 'users:write', label: 'Manage Users', description: 'Create, update, and manage user accounts' },
  { id: 'plans:manage', label: 'Manage Plans', description: 'Configure package pricing and limits' },
  { id: 'promotions:manage', label: 'Manage Promotions', description: 'Control 1 Month Free offers & campaign dates' },
  { id: 'credits:manage', label: 'Adjust Credits', description: 'Grant or deduct platform credits' },
  { id: 'payments:manage', label: 'Manage Billing', description: 'Inspect transactions, subscriptions & payments' },
  { id: 'publishing:read', label: 'Audit Publishing', description: 'View scheduled posts and social account logs' },
  { id: 'analytics:read', label: 'Analytics Insights', description: 'Access platform growth and metric analytics' },
  { id: 'admins:manage', label: 'Admin Governance', description: 'Manage administrators and system audit logs' }
];

const DEFAULT_ADMIN_PERMISSIONS = [
  'users:read',
  'users:write',
  'plans:manage',
  'promotions:manage',
  'credits:manage',
  'payments:manage',
  'publishing:read',
  'analytics:read'
];

const DEFAULT_SUPPORT_PERMISSIONS = [
  'users:read',
  'publishing:read',
  'analytics:read'
];

export function AdminManagementPage() {
  const { user: currentAdmin } = useAuth();
  const [administrators, setAdministrators] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'invitations' | 'audit'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Success / credentials sharing modals
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [passwordChangedSuccess, setPasswordChangedSuccess] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Target admin for actions
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form states - Direct Admin Creation
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('ADMIN');
  const [createPermissions, setCreatePermissions] = useState(DEFAULT_ADMIN_PERMISSIONS);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form states - Password Reset
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form states - Invitation link (secondary option)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [invitePermissions, setInvitePermissions] = useState(DEFAULT_ADMIN_PERMISSIONS);

  // Form states - Role & Revoke
  const [newRole, setNewRole] = useState('ADMIN');
  const [adminPassword, setAdminPassword] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const [actionNotice, setActionNotice] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  // Secure Password Generator Helper
  const generateStrongPassword = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%&*';
    let pwd = '';
    pwd += letters[Math.floor(Math.random() * letters.length)];
    pwd += letters[Math.floor(Math.random() * letters.length)].toUpperCase();
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];
    const all = letters + numbers + specials;
    for (let i = 0; i < 8; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsRes, logsRes] = await Promise.all([
        api.get('/admin/administrators'),
        api.get('/admin/administrators/audit-logs')
      ]);

      if (adminsRes.success && adminsRes.data) {
        setAdministrators(adminsRes.data.administrators || []);
        setPendingInvitations(adminsRes.data.pendingInvitations || []);
      }
      if (logsRes.success && logsRes.data) {
        setAuditLogs(logsRes.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load administrator data:', err);
      setActionNotice({ type: 'error', text: err.message || 'Failed to fetch administrator data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard Escape listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setCreatedCredentials(null);
        setIsPasswordModalOpen(false);
        setPasswordChangedSuccess(null);
        setIsInviteModalOpen(false);
        setIsRoleModalOpen(false);
        setIsPermsModalOpen(false);
        setIsRevokeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isCreateModalOpen ||
      createdCredentials ||
      isPasswordModalOpen ||
      passwordChangedSuccess ||
      isInviteModalOpen ||
      isRoleModalOpen ||
      isPermsModalOpen ||
      isRevokeModalOpen
    );
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [
    isCreateModalOpen,
    createdCredentials,
    isPasswordModalOpen,
    passwordChangedSuccess,
    isInviteModalOpen,
    isRoleModalOpen,
    isPermsModalOpen,
    isRevokeModalOpen
  ]);

  const showNotice = (type, text) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice({ type: '', text: '' }), 7000);
  };

  // 1. Direct Administrator Creation (Super Admin sets name, email, password directly - No email needed)
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword) return;

    if (createPassword.length < 8) {
      showNotice('error', 'Password must be at least 8 characters long.');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(createPassword)) {
      showNotice('error', 'Password must contain at least one symbol (e.g. !@#$%^&*).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/administrators', {
        name: createName.trim(),
        email: createEmail.toLowerCase().trim(),
        password: createPassword,
        role: createRole,
        permissions: createRole === 'SUPER_ADMIN' ? ['*'] : createPermissions
      });

      if (res.success) {
        const portalUrl = `${window.location.origin}/admin/login`;
        setCreatedCredentials({
          name: createName.trim(),
          email: createEmail.toLowerCase().trim(),
          password: createPassword,
          role: createRole,
          portalUrl
        });
        showNotice('success', res.message || `Administrator ${createEmail} created successfully.`);
        setIsCreateModalOpen(false);
        setCreateName('');
        setCreateEmail('');
        setCreatePassword('');
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to create administrator.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error occurred while creating administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Direct Password Reset (Super Admin sets new password for existing admin - verbally tells them)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || !newPasswordInput) return;

    if (newPasswordInput.length < 8) {
      showNotice('error', 'New password must be at least 8 characters long.');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(newPasswordInput)) {
      showNotice('error', 'New password must contain at least one symbol (e.g. !@#$%^&*).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/admin/administrators/${selectedAdmin.id}/password`, {
        newPassword: newPasswordInput
      });

      if (res.success) {
        const portalUrl = `${window.location.origin}/admin/login`;
        setPasswordChangedSuccess({
          adminName: selectedAdmin.name,
          adminEmail: selectedAdmin.email,
          newPassword: newPasswordInput,
          portalUrl
        });
        showNotice('success', res.message || `Password for ${selectedAdmin.email} updated.`);
        setIsPasswordModalOpen(false);
        setNewPasswordInput('');
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to update administrator password.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error updating password.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Send Invitation (Email Link - optional)
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSubmitting(true);
    try {
      const res = await api.post('/admin/administrators/invite', {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        permissions: inviteRole === 'SUPER_ADMIN' ? ['*'] : invitePermissions
      });

      if (res.success) {
        showNotice('success', res.message || `Invitation successfully sent to ${inviteEmail}`);
        setIsInviteModalOpen(false);
        setInviteEmail('');
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to send invitation.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error occurred while creating invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Resend Invitation
  const handleResendInvite = async (id, email) => {
    try {
      const res = await api.post(`/admin/administrators/resend-invite/${id}`);
      if (res.success) {
        showNotice('success', `Invitation re-sent successfully to ${email}.`);
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to resend invitation.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error resending invitation.');
    }
  };

  // 5. Revoke Invitation
  const handleRevokeInvite = async (id, email) => {
    if (!window.confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;
    try {
      const res = await api.delete(`/admin/administrators/invite/${id}`);
      if (res.success) {
        showNotice('success', `Invitation for ${email} revoked.`);
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to revoke invitation.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error revoking invitation.');
    }
  };

  // 6. Update Role
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || !adminPassword) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/admin/administrators/${selectedAdmin.id}/role`, {
        newRole,
        adminPassword
      });

      if (res.success) {
        showNotice('success', res.message);
        setIsRoleModalOpen(false);
        setAdminPassword('');
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to update role.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error updating role.');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Update Permissions
  const handleUpdatePermissions = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/admin/administrators/${selectedAdmin.id}/permissions`, {
        permissions: selectedAdmin.permissions || []
      });

      if (res.success) {
        showNotice('success', res.message || 'Permissions updated successfully.');
        setIsPermsModalOpen(false);
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to update permissions.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error updating permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Suspend / Reactivate Admin
  const handleToggleStatus = async (admin) => {
    const nextStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'reactivate' : 'suspend';

    if (!window.confirm(`Are you sure you want to ${actionLabel} administrator ${admin.email}?`)) return;

    try {
      const res = await api.patch(`/admin/administrators/${admin.id}/status`, {
        status: nextStatus,
        reason: `Super Admin ${actionLabel} action`
      });

      if (res.success) {
        showNotice('success', res.message);
        loadData();
      } else {
        showNotice('error', res.message || `Failed to ${actionLabel} administrator.`);
      }
    } catch (err) {
      showNotice('error', err.message || `Error attempting to ${actionLabel} administrator.`);
    }
  };

  // 9. Revoke Admin Access (demote to USER)
  const handleRevokeAccess = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || !adminPassword) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/admin/administrators/${selectedAdmin.id}/revoke`, {
        adminPassword,
        reason: revokeReason || 'Super Admin revoked admin privileges'
      });

      if (res.success) {
        showNotice('success', res.message);
        setIsRevokeModalOpen(false);
        setAdminPassword('');
        setRevokeReason('');
        loadData();
      } else {
        showNotice('error', res.message || 'Failed to revoke administrator access.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error revoking administrator access.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Super Admin
        </span>
      );
    }
    if (role === 'SUPPORT_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          <Shield className="w-3 h-3 text-blue-500" />
          Support Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
        <ShieldCheck className="w-3 h-3 text-cyan-500" />
        Administrator
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#3B5BFF]/10 via-[#7C3AED]/10 to-transparent border border-[#3B5BFF]/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B5BFF]/15 border border-[#3B5BFF]/30 text-[#3B5BFF] dark:text-[#818cf8] text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role-Based Access Control (RBAC)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Administrator Governance & Access
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 max-w-2xl leading-relaxed">
            Directly create administrators, assign passwords, control granular permissions, reset credentials instantly, and maintain an unalterable security audit trail.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center shrink-0">
            {/* Primary Action: Direct Admin Creation */}
            <button
              onClick={() => {
                setCreatePassword(generateStrongPassword());
                setShowCreatePassword(false);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#3B5BFF]/25 flex items-center gap-2.5 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Administrator</span>
            </button>

            {/* Secondary Action: Invite via Link (Optional) */}
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-3 rounded-2xl border border-[#3B5BFF]/30 hover:bg-[#3B5BFF]/10 text-[#3B5BFF] dark:text-[#818cf8] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Invite via Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ type: '', text: '' })}
            className="font-bold underline text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'admins'
              ? 'bg-[#3B5BFF] text-white shadow-md'
              : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Administrators ({administrators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'invitations'
              ? 'bg-[#3B5BFF] text-white shadow-md'
              : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Pending Invitations ({pendingInvitations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'bg-[#3B5BFF] text-white shadow-md'
              : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: ACTIVE ADMINISTRATORS
      ======================================================== */}
      {activeTab === 'admins' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3B5BFF]" />
              Authorized System Operators
            </h3>
            <span className="text-xs text-[#475569] dark:text-slate-400">
              PostgreSQL Live Accounts ({administrators.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-[#334155]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Administrator</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Permissions</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                {administrators.map((admin) => {
                  const isCurrent = admin.id === currentAdmin?.id;
                  const isSuspended = admin.status === 'SUSPENDED';

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B5BFF] to-[#7C3AED] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {admin.name?.charAt(0) || 'A'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0F172A] dark:text-white truncate">
                                {admin.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#475569] dark:text-slate-400 block truncate">
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">{getRoleBadge(admin.role)}</td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuspended
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          {admin.status}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {admin.role === 'SUPER_ADMIN' || admin.permissions?.includes('*') ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            Full Unrestricted Access (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {admin.permissions?.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 px-2 py-0.5 rounded-md"
                              >
                                {p}
                              </span>
                            ))}
                            {admin.permissions?.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{admin.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-[#475569] dark:text-slate-400 text-[11px]">
                        {admin.lastLoginAt
                          ? new Date(admin.lastLoginAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never logged in'}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {isSuperAdmin ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Set / Change Password */}
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setNewPasswordInput(generateStrongPassword());
                                setShowNewPassword(false);
                                setIsPasswordModalOpen(true);
                              }}
                              title="Set / Reset Password (Directly Tell Admin)"
                              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Modify Role */}
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setNewRole(admin.role);
                                setIsRoleModalOpen(true);
                              }}
                              title="Modify Role"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5 text-blue-500" />
                            </button>

                            {/* Configure Permissions */}
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setIsPermsModalOpen(true);
                              }}
                              title="Configure Granular Permissions"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* Suspend / Reactivate */}
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              title={isSuspended ? 'Reactivate Administrator' : 'Suspend Administrator'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSuspended
                                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                                  : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                              }`}
                            >
                              {isSuspended ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <UserX className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Revoke Access */}
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setIsRevokeModalOpen(true);
                              }}
                              title="Revoke Admin Access"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PENDING INVITATIONS (Optional Links)
      ======================================================== */}
      {activeTab === 'invitations' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#3B5BFF]" />
              Active Administrator Invitations (Single-Use Links)
            </h3>
            <span className="text-xs text-[#475569] dark:text-slate-400">
              Cryptographically Hashed Tokens
            </span>
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="p-12 text-center text-[#475569] dark:text-slate-400 text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-semibold">No pending administrator email invitations.</p>
              <p className="mt-1">
                Tip: You can use "Add New Administrator" to directly set up their account and password without sending email.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-[#334155]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Invited Email</th>
                    <th className="py-3.5 px-4">Designated Role</th>
                    <th className="py-3.5 px-4">Invited By</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4">Expires In</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                  {pendingInvitations.map((inv) => {
                    const expiresAtDate = new Date(inv.expiresAt);
                    const hoursLeft = Math.max(
                      0,
                      Math.round((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60))
                    );

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6 font-bold text-[#0F172A] dark:text-white">
                          {inv.email}
                        </td>
                        <td className="py-4 px-4">{getRoleBadge(inv.role)}</td>
                        <td className="py-4 px-4 text-[#475569] dark:text-slate-400">
                          {inv.invitedBy?.name || 'Super Admin'}
                        </td>
                        <td className="py-4 px-4 text-[#475569] dark:text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            {hoursLeft} hours remaining
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {isSuperAdmin && (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleResendInvite(inv.id, inv.email)}
                                title="Resend invitation email"
                                className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 text-[#3B5BFF] dark:text-[#818cf8]"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Resend</span>
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id, inv.email)}
                                title="Revoke invitation link"
                                className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 text-rose-600"
                              >
                                <X className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: AUDIT LOG TRAIL
      ======================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#3B5BFF]" />
              Immutable Administrative Audit History
            </h3>
            <span className="text-xs text-[#475569] dark:text-slate-400">
              Security Action Logs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target / Specifics</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                {auditLogs.map((log) => {
                  let detailsObj = null;
                  try {
                    detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                  } catch {
                    detailsObj = log.details;
                  }

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6 text-[#475569] dark:text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A] dark:text-white">
                        {log.admin?.name || log.admin?.email || 'System'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-[#475569] dark:text-slate-300 max-w-sm truncate">
                        {typeof detailsObj === 'object' ? JSON.stringify(detailsObj) : String(detailsObj)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: DIRECT ADD NEW ADMINISTRATOR
          Rendered via React Portal directly into document.body for
          perfect global viewport alignment, centering, and no overflow cuts.
      ======================================================== */}
      {isCreateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsCreateModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-fade-in"
              style={{
                width: 'min(580px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0 bg-white dark:bg-[#111827]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white leading-tight">
                      Add New Administrator
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                      Directly provision an admin with a password. No email required.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form id="createAdminForm" onSubmit={handleCreateAdmin} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Administrator Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin.colleague@socialsync.ai"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                  />
                </div>

                {/* Password (Super Admin creates password directly) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0F172A] dark:text-white">
                      Set Administrator Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateStrongPassword();
                        setCreatePassword(generated);
                        setShowCreatePassword(true);
                      }}
                      className="text-[11px] font-semibold text-[#3B5BFF] hover:text-[#7C3AED] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Strong Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Enter password (min 8 chars with a symbol)"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
                    At least 8 characters with a symbol. You will tell this password to the new administrator directly after saving.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Designated Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setCreateRole(r);
                      if (r === 'SUPER_ADMIN') {
                        setCreatePermissions(['*']);
                      } else if (r === 'SUPPORT_ADMIN') {
                        setCreatePermissions(DEFAULT_SUPPORT_PERMISSIONS);
                      } else {
                        setCreatePermissions(DEFAULT_ADMIN_PERMISSIONS);
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white font-semibold"
                  >
                    <option value="ADMIN">Administrator (Standard - Full Operation Access)</option>
                    <option value="SUPPORT_ADMIN">Support Admin (Read-Only / Support Assistance)</option>
                    <option value="SUPER_ADMIN">Super Administrator (Unrestricted System Governance)</option>
                  </select>
                </div>

                {/* Granular Permissions (Only for ADMIN and SUPPORT_ADMIN) */}
                {createRole !== 'SUPER_ADMIN' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0F172A] dark:text-white">
                        Assigned Granular Permissions ({createPermissions.length}/{AVAILABLE_PERMISSIONS.length})
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setCreatePermissions(AVAILABLE_PERMISSIONS.map((p) => p.id))}
                          className="text-[#3B5BFF] hover:underline"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setCreatePermissions([])}
                          className="text-slate-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-[#334155]">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const checked = createPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreatePermissions([...createPermissions, perm.id]);
                                } else {
                                  setCreatePermissions(createPermissions.filter((p) => p !== perm.id));
                                }
                              }}
                              className="mt-0.5 rounded text-[#3B5BFF] focus:ring-0"
                            />
                            <div>
                              <span className="font-semibold block text-[#0F172A] dark:text-white text-[11px]">
                                {perm.label}
                              </span>
                              <span className="text-[10px] text-[#475569] dark:text-slate-400 leading-tight">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Super Administrators inherently receive unrestricted wildcard access (<code>*</code>) across all system modules.</span>
                  </div>
                )}

                {/* Informative direct notice */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-[#3B5BFF] dark:text-[#818cf8] text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Direct Account Provisioning:</strong> No email is sent. The account is created immediately with 1,000 credits and active status. You can share the password verbally or via secure message.
                  </p>
                </div>
              </form>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-slate-900/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#475569] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="createAdminForm"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#3B5BFF]/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Creating Administrator...' : 'Create Administrator Now'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          CREDENTIALS SHARING MODAL (Shown after direct creation)
      ======================================================== */}
      {createdCredentials &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setCreatedCredentials(null)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-emerald-200 dark:border-emerald-800/50 shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in overflow-y-auto"
              style={{
                width: 'min(480px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Administrator Created!
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Account is live and ready for login
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#475569] dark:text-slate-300">
                No email was sent. You can now copy and verbally or directly share these login credentials with <strong>{createdCredentials.name}</strong>:
              </p>

              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-[#334155] text-xs">
                {/* Email */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <span className="font-mono font-bold text-[#0F172A] dark:text-white">{createdCredentials.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Copy email"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Password</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm select-all">
                      {createdCredentials.password}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Copy password"
                  >
                    {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Role */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Role</span>
                    <span className="font-semibold text-[#0F172A] dark:text-white">{createdCredentials.role}</span>
                  </div>
                </div>

                {/* Login Portal */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Admin Login Portal</span>
                    <span className="font-mono text-[11px] text-[#3B5BFF] dark:text-[#818cf8] truncate block max-w-[220px]">
                      {createdCredentials.portalUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.portalUrl, 'portal')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Copy login URL"
                  >
                    {copiedField === 'portal' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick Copy All Details */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const bundle = `SocialSync AI Administrator Login:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nPortal: ${createdCredentials.portalUrl}`;
                    copyToClipboard(bundle, 'all');
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Copied Credentials to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy All Credentials</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="w-full py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          MODAL 2: SET / RESET ADMINISTRATOR PASSWORD (Directly by Super Admin)
      ======================================================== */}
      {isPasswordModalOpen &&
        selectedAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsPasswordModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in overflow-y-auto"
              style={{
                width: 'min(480px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Set Administrator Password
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Directly change password for {selectedAdmin.name} ({selectedAdmin.email})
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0F172A] dark:text-white">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateStrongPassword();
                        setNewPasswordInput(generated);
                        setShowNewPassword(true);
                      }}
                      className="text-[11px] font-semibold text-[#3B5BFF] hover:text-[#7C3AED] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate New</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Enter new password (min 8 chars with a symbol)"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
                    Must be at least 8 characters and contain at least one symbol (!@#$%^&*).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-[#475569] dark:text-slate-400">
                  Updating the password will immediately invalidate all existing sessions for this administrator. No email is sent; you can tell them the new password directly.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{submitting ? 'Updating Password...' : 'Save & Set Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          PASSWORD CHANGED SUCCESS MODAL
      ======================================================== */}
      {passwordChangedSuccess &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setPasswordChangedSuccess(null)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-emerald-200 dark:border-emerald-800/50 shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in overflow-y-auto"
              style={{
                width: 'min(480px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Password Updated!
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      New password active immediately
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordChangedSuccess(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#475569] dark:text-slate-300">
                The password for <strong>{passwordChangedSuccess.adminEmail}</strong> has been updated. You can tell them their new password:
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-[#334155] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">New Password</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm select-all">
                      {passwordChangedSuccess.newPassword}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(passwordChangedSuccess.newPassword, 'pwd-reset')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    {copiedField === 'pwd-reset' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const text = `Your new SocialSync AI Admin password is: ${passwordChangedSuccess.newPassword}\nLogin Portal: ${passwordChangedSuccess.portalUrl}`;
                  copyToClipboard(text, 'pwd-bundle');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
              >
                {copiedField === 'pwd-bundle' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Copied New Password!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Password to Tell Admin</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPasswordChangedSuccess(null)}
                className="w-full py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          MODAL 3: INVITE ADMINISTRATOR VIA EMAIL LINK
      ======================================================== */}
      {isInviteModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsInviteModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-fade-in"
              style={{
                width: 'min(540px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0 bg-white dark:bg-[#111827]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Send Administrator Invitation Link
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Sends a single-use, 48-hour secure email acceptance link
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="inviteAdminForm" onSubmit={handleSendInvite} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@domain.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Administrative Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setInviteRole(r);
                      if (r === 'SUPER_ADMIN') {
                        setInvitePermissions(['*']);
                      } else if (r === 'SUPPORT_ADMIN') {
                        setInvitePermissions(DEFAULT_SUPPORT_PERMISSIONS);
                      } else {
                        setInvitePermissions(DEFAULT_ADMIN_PERMISSIONS);
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  >
                    <option value="ADMIN">Administrator (Granular Access)</option>
                    <option value="SUPPORT_ADMIN">Support Admin (Read-only / Support)</option>
                    <option value="SUPER_ADMIN">Super Administrator (Full System Control)</option>
                  </select>
                </div>

                {inviteRole !== 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1.5">
                      Assigned Granular Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-[#334155]">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const checked = invitePermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInvitePermissions([...invitePermissions, perm.id]);
                                } else {
                                  setInvitePermissions(invitePermissions.filter((p) => p !== perm.id));
                                }
                              }}
                              className="mt-0.5 rounded text-[#3B5BFF] focus:ring-0"
                            />
                            <div>
                              <span className="font-semibold block text-[#0F172A] dark:text-white">
                                {perm.label}
                              </span>
                              <span className="text-[10px] text-[#475569] dark:text-slate-400 leading-none">
                                {perm.id}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>

              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-slate-900/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#475569] dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="inviteAdminForm"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#3B5BFF]/20 disabled:opacity-50"
                >
                  {submitting ? 'Creating Invitation...' : 'Send Invitation Email'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          MODAL 4: UPDATE ROLE
      ======================================================== */}
      {isRoleModalOpen &&
        selectedAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsRoleModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in overflow-y-auto"
              style={{
                width: 'min(480px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Update Administrator Role
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Modifying {selectedAdmin.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRole} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    New System Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  >
                    <option value="SUPER_ADMIN">Super Administrator (Full Power)</option>
                    <option value="ADMIN">Administrator (Standard)</option>
                    <option value="SUPPORT_ADMIN">Support Administrator (Read-Only Support)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Your Super Admin Password (Confirmation)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your current password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-[#475569] dark:text-slate-400">
                  Changing an administrator's role immediately invalidates their active JWT sessions and enforces the new privileges on their next request.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#3B5BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-md"
                  >
                    {submitting ? 'Applying Role Change...' : 'Confirm Role Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          MODAL 5: GRANULAR PERMISSIONS
      ======================================================== */}
      {isPermsModalOpen &&
        selectedAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsPermsModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-fade-in"
              style={{
                width: 'min(560px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0 bg-white dark:bg-[#111827]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                      Granular Permission Matrix
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Configuring {selectedAdmin.name} ({selectedAdmin.email})
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsPermsModalOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const currentPerms = selectedAdmin.permissions || [];
                  const isChecked = currentPerms.includes('*') || currentPerms.includes(perm.id);

                  return (
                    <label
                      key={perm.id}
                      className="flex items-start gap-3 p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={currentPerms.includes('*')}
                        onChange={(e) => {
                          let nextPerms = [...currentPerms];
                          if (e.target.checked) {
                            nextPerms.push(perm.id);
                          } else {
                            nextPerms = nextPerms.filter((p) => p !== perm.id);
                          }
                          setSelectedAdmin({ ...selectedAdmin, permissions: nextPerms });
                        }}
                        className="mt-1 rounded text-[#3B5BFF] focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-xs text-[#0F172A] dark:text-white block">
                          {perm.label}
                        </span>
                        <span className="text-[11px] text-[#475569] dark:text-slate-400 block mt-0.5">
                          {perm.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-slate-900/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPermsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePermissions}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#3B5BFF]/20"
                >
                  {submitting ? 'Saving Matrix...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================
          MODAL 6: REVOKE ADMIN PRIVILEGES
      ======================================================== */}
      {isRevokeModalOpen &&
        selectedAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsRevokeModalOpen(false)}
              aria-hidden="true"
            />

            <div
              className="relative z-10 w-full bg-white dark:bg-[#111827] rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in overflow-y-auto"
              style={{
                width: 'min(480px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-600">
                      Revoke Administrator Access
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Demotes account to standard USER status
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsRevokeModalOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRevokeAccess} className="space-y-4">
                <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                  You are removing administrative access from{' '}
                  <strong className="text-[#0F172A] dark:text-white">{selectedAdmin.email}</strong>.
                  Their permissions will be purged, their account demoted, and all active sessions immediately invalidated.
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Reason for Revocation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Role transitioned, contract conclusion"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Your Super Admin Password (Required Confirmation)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm with your password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setIsRevokeModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {submitting ? 'Revoking...' : 'Revoke Privileges Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default AdminManagementPage;
