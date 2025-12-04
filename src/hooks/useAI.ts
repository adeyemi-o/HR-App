import { useState, useCallback } from 'react';
import { aiClient } from '@/lib/aiClient';
import type {
    ApplicantSummary,
    ApplicantRanking,
    OfferLetter,
    OnboardingSummary,
    SetupHelper
} from '@/lib/ai/schemas';

interface UseAIResult<T, I> {
    generate: (input: I) => Promise<T | null>;
    data: T | null;
    loading: boolean;
    error: Error | null;
    reset: () => void;
}

export function useAISummary(): UseAIResult<ApplicantSummary, any> {
    const [data, setData] = useState<ApplicantSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generate = useCallback(async (applicant: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiClient.summarizeApplicant(applicant);
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { generate, data, loading, error, reset };
}

export function useAIRanking(): UseAIResult<ApplicantRanking, { candidates: any[]; jobDescription: string }> {
    const [data, setData] = useState<ApplicantRanking | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generate = useCallback(async ({ candidates, jobDescription }: { candidates: any[]; jobDescription: string }) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiClient.rankApplicants(candidates, jobDescription);
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { generate, data, loading, error, reset };
}

export function useAIOfferLetter(): UseAIResult<OfferLetter, any> {
    const [data, setData] = useState<OfferLetter | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generate = useCallback(async (details: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiClient.draftOfferLetter(details);
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { generate, data, loading, error, reset };
}

export function useAIOnboarding(): UseAIResult<OnboardingSummary, { employee: any; status: string }> {
    const [data, setData] = useState<OnboardingSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generate = useCallback(async ({ employee, status }: { employee: any; status: string }) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiClient.onboardingLogic(employee, status);
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { generate, data, loading, error, reset };
}

export function useAISetupHelper(): UseAIResult<SetupHelper, string> {
    const [data, setData] = useState<SetupHelper | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generate = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiClient.setupHelper(query);
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { generate, data, loading, error, reset };
}
