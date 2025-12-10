import { X } from 'lucide-react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const confirmButtonClass = variant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-[#7152F3] hover:bg-[rgba(113,82,243,0.9)] text-white';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                <div className="bg-white dark:bg-[#1A1A1A] rounded-[20px] border border-[rgba(162,161,168,0.1)] shadow-xl p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[#16151C] dark:text-white">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-[#A2A1A8] mb-6 text-sm leading-relaxed">
                        {description}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-[rgba(162,161,168,0.2)] text-[#16151C] dark:text-white rounded-[10px] hover:bg-[rgba(162,161,168,0.05)] transition-colors font-light"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 px-4 py-2 rounded-[10px] transition-colors font-light ${confirmButtonClass}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
