import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal dialog */}
        <div
          className={`w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] p-6 text-left align-middle shadow-2xl transition-all relative z-10 animate-fade-in`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
            <h3 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start gap-3 mt-1">
        {isDestructive && (
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full shrink-0 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
export default Modal;
