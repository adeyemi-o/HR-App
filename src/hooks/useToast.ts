import { toast as sonnerToast } from 'sonner';

/**
 * Custom toast hook that wraps Sonner's toast functionality
 * Provides consistent styling and duration defaults
 */
export const toast = {
    success: (message: string) => {
        sonnerToast.success(message, {
            duration: 4000,
        });
    },

    error: (message: string) => {
        sonnerToast.error(message, {
            duration: 5000,
        });
    },

    info: (message: string) => {
        sonnerToast.info(message, {
            duration: 4000,
        });
    },

    warning: (message: string) => {
        sonnerToast.warning(message, {
            duration: 4000,
        });
    },

    loading: (message: string) => {
        return sonnerToast.loading(message);
    },

    promise: <T,>(
        promise: Promise<T>,
        {
            loading,
            success,
            error,
        }: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: Error) => string);
        }
    ) => {
        return sonnerToast.promise(promise, {
            loading,
            success,
            error,
        });
    },
};
