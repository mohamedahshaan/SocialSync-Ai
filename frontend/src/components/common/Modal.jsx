import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth,
  size,
  width,
  showClose = true,
  onSubmit,
  formId
}) {
  // Prevent page background scrolling when modal is open and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthToWidth = {
    'max-w-sm': 'min(380px, calc(100vw - 32px))',
    'max-w-md': 'min(460px, calc(100vw - 32px))',
    'max-w-lg': 'min(560px, calc(100vw - 32px))',
    'max-w-xl': 'min(640px, calc(100vw - 32px))',
    'max-w-2xl': 'min(720px, calc(100vw - 32px))',
    'max-w-4xl': 'min(920px, calc(100vw - 32px))'
  };

  const computedMaxWidth = maxWidth || (size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md');
  const computedWidth =
    width ||
    (size === 'lg'
      ? 'min(720px, calc(100vw - 32px))'
      : size === 'xl'
      ? 'min(920px, calc(100vw - 32px))'
      : size === 'sm'
      ? 'min(380px, calc(100vw - 32px))'
      : maxWidth && maxWidthToWidth[maxWidth]
      ? maxWidthToWidth[maxWidth]
      : 'min(460px, calc(100vw - 32px))');

  const DialogComponent = onSubmit ? 'form' : 'div';

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop: subtle dark tint with minimal 2px blur */}
      <div
        className="fixed inset-0 transition-opacity animate-fade-in"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal dialog: sharp, crisp, completely unaffected by backdrop filters */}
      <DialogComponent
        id={formId}
        onSubmit={onSubmit}
        className={`w-full ${computedMaxWidth} flex flex-col overflow-hidden overflow-x-hidden min-h-0 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-left shadow-2xl transition-all relative z-10 animate-fade-in my-auto`}
        style={{
          width: computedWidth,
          maxHeight: 'calc(100dvh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className={`flex items-start justify-between px-6 pt-5 ${title ? 'pb-4 border-b border-[#E2E8F0] dark:border-[#334155]' : 'pb-0'} shrink-0 bg-white dark:bg-[#111827]`}>
            {title ? (
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-[#475569] dark:text-slate-400">{subtitle}</p>
                )}
              </div>
            ) : (
              <div />
            )}
            {showClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg p-1 transition-colors cursor-pointer ml-auto"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`overflow-y-auto min-h-0 flex-1 ${title ? 'p-6 pt-4' : showClose ? 'px-6 pt-2 pb-5' : 'p-6'}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120]/60">
            {footer}
          </div>
        )}
      </DialogComponent>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
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
  isLoading = false,
  maxWidth,
  width = 'min(440px, calc(100vw - 32px))',
  userDetail = null,
  children
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={!isLoading ? onClose : undefined}
      showClose={!isLoading}
      maxWidth={maxWidth}
      width={width}
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 text-xs py-2.5"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className={`flex-1 text-xs py-2.5 ${isDestructive ? 'bg-rose-600 hover:bg-rose-500 text-white font-semibold' : ''}`}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="text-center p-1">
        {isDestructive ? (
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-3.5 ring-8 ring-rose-50 dark:ring-rose-900/20">
            <AlertCircle className="w-6 h-6" />
          </div>
        ) : null}

        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
          {title}
        </h3>

        {userDetail && (
          <div className="mt-2 text-xs text-[#475569] dark:text-slate-400">
            {userDetail}
          </div>
        )}

        {message && (
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-2 leading-relaxed">
            {message}
          </p>
        )}

        {children}
      </div>
    </Modal>
  );
}
export default Modal;
