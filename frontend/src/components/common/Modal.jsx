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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal dialog */}
        <div
          className={`w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-premium transition-all relative z-10 animate-fade-in`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
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
          <div className="p-2 bg-rose-50 text-rose-600 rounded-full shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
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
