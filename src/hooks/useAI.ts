import { useState } from 'react';
import { aiClient } from '../lib/aiClient';

export function useAISummary() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const generateSummary = async (applicant: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiClient.summarizeApplicant(applicant);
            setResult(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { generateSummary, result, loading, error };
}

export function useAIRanking() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const rankApplicants = async (candidates: any[], jobDescription: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiClient.rankApplicants(candidates, jobDescription);
            setResult(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { rankApplicants, result, loading, error };
}

export function useAIDraftOffer() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const draftOffer = async (details: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiClient.draftOfferLetter(details);
            setResult(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { draftOffer, result, loading, error };
}

export function useAIOnboarding() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const getOnboardingLogic = async (employee: any, status: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiClient.onboardingLogic(employee, status);
            setResult(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { getOnboardingLogic, result, loading, error };
}

export function useAIValidation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const validateUser = async (group: string, user: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiClient.wpValidation(group, user);
            setResult(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { validateUser, result, loading, error };
}
