import { useState, useCallback } from 'react';

export interface ConfirmOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}

export interface ConfirmState extends ConfirmOptions {
    isOpen: boolean;
    resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
    const [state, setState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'default',
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                ...options,
                isOpen: true,
                resolve,
            });
        });
    }, []);

    const handleClose = useCallback(() => {
        if (state.resolve) {
            state.resolve(false);
        }
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const handleConfirm = useCallback(() => {
        if (state.resolve) {
            state.resolve(true);
        }
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    return {
        confirm,
        confirmState: state,
        handleClose,
        handleConfirm,
    };
}
