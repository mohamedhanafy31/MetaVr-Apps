'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Users, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  icon?: React.ReactNode;
  isLoading?: boolean;
  destructiveText?: string; // Additional text to show for destructive actions
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  icon,
  isLoading = false,
  destructiveText
}: ConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling is done by the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          borderColor: 'border-red-200 dark:border-red-800'
        };
    }
  };

  const styles = getVariantStyles();
  const defaultIcon = variant === 'destructive' ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${styles.iconBg}`}>
                <div className={styles.iconColor}>
                  {icon || defaultIcon}
                </div>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {title}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>

            {destructiveText && (
              <div className={`p-3 rounded-lg border ${styles.borderColor} bg-muted/50`}>
                <p className="text-sm font-medium text-foreground">
                  {destructiveText}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isDeleting || isLoading}
                className="min-w-[80px]"
              >
                {cancelText}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isDeleting || isLoading}
                className={`min-w-[80px] ${styles.confirmButton}`}
              >
                <AnimatePresence mode="wait">
                  {isDeleting || isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      {variant === 'destructive' && <Trash2 className="w-4 h-4" />}
                      <span>{confirmText}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Specialized confirmation dialogs for common use cases
export function DeleteUserDialog({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete User"
      description={`Are you sure you want to delete this user? This action cannot be undone.`}
      confirmText="Delete User"
      variant="destructive"
      icon={<Users className="w-6 h-6" />}
      isLoading={isLoading}
      destructiveText={`This will permanently delete ${userName} (${userEmail}) and all associated data.`}
    />
  );
}

export function DeleteApplicationDialog({
  isOpen,
  onClose,
  onConfirm,
  appName,
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appName: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Application"
      description={`Are you sure you want to delete this application? This action cannot be undone.`}
      confirmText="Delete Application"
      variant="destructive"
      icon={<Package className="w-6 h-6" />}
      isLoading={isLoading}
      destructiveText={`This will permanently delete "${appName}" and all associated data.`}
    />
  );
}

export function DeleteAllApplicationsDialog({
  isOpen,
  onClose,
  onConfirm,
  appCount,
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appCount: number;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete All Applications"
      description={`Are you sure you want to delete all applications? This action cannot be undone.`}
      confirmText="Delete All"
      variant="destructive"
      icon={<Trash2 className="w-6 h-6" />}
      isLoading={isLoading}
      destructiveText={`This will permanently delete all ${appCount} applications and all associated data.`}
    />
  );
}

export function DeleteAllUsersDialog({
  isOpen,
  onClose,
  onConfirm,
  userCount,
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userCount: number;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete All Users"
      description={`Are you sure you want to delete all users? This action cannot be undone.`}
      confirmText="Delete All"
      variant="destructive"
      icon={<Users className="w-6 h-6" />}
      isLoading={isLoading}
      destructiveText={`This will permanently delete all ${userCount} users and all associated data.`}
    />
  );
}
