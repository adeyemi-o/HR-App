import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { offerService } from '@/services/offerService';
import { applicantService } from '@/services/applicantService';
import type { Applicant } from '@/types';
import { ArrowLeft, Save, User, Briefcase, DollarSign, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfferFormData {
    applicant_id: string;
    position_title: string;
    start_date: string;
    salary: number;
}

export function OfferEditor() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<OfferFormData>();

    useEffect(() => {
        loadApplicants();
        if (id) {
            loadOffer(id);
        }
    }, [id]);

    const loadApplicants = async () => {
        const data = await applicantService.getApplicants();
        // Filter out applicants who are already Hired or Rejected
        const eligibleApplicants = data.filter(app => app.status !== 'Hired' && app.status !== 'Rejected');
        setApplicants(eligibleApplicants);
    };

    const loadOffer = async (offerId: string) => {
        const data = await offerService.getOfferById(offerId);
        reset({
            applicant_id: data.applicant_id,
            position_title: data.position_title,
            start_date: data.start_date,
            salary: data.salary,
        });
    };

    const onSubmit = async (data: OfferFormData) => {
        setLoading(true);
        try {
            if (id) {
                // Update existing offer (not implemented in service yet, but placeholder)
                console.log('Update offer', id, data);
            } else {
                await offerService.createOffer({
                    ...data,
                    status: 'Draft',
                });
            }
            navigate('/offers');
        } catch (error) {
            console.error('Failed to save offer', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/offers')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[#16151C] dark:text-white">
                        {id ? 'Edit Offer' : 'Create New Offer'}
                    </h1>
                    <p className="text-sm text-[#A2A1A8] font-light">
                        {id ? 'Update the offer details below' : 'Fill in the details to create a new offer letter'}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-8 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">

                        {/* Applicant Selection */}
                        <div className="sm:col-span-2">
                            <label htmlFor="applicant" className="block text-sm font-medium text-[#16151C] dark:text-white mb-2">
                                Applicant
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-5 w-5 text-[#A2A1A8]" aria-hidden="true" />
                                </div>
                                <select
                                    id="applicant"
                                    {...register('applicant_id', { required: 'Applicant is required' })}
                                    className="block w-full rounded-[10px] border border-[rgba(162,161,168,0.2)] bg-transparent py-3 pl-10 pr-10 text-[#16151C] dark:text-white placeholder:text-[#A2A1A8] focus:border-[#7152F3] focus:ring-1 focus:ring-[#7152F3] sm:text-sm font-light appearance-none"
                                >
                                    <option value="" className="text-[#A2A1A8] dark:bg-[#1E1E24]">Select an applicant</option>
                                    {applicants.map((app) => (
                                        <option key={app.id} value={app.id} className="text-[#16151C] dark:text-white dark:bg-[#1E1E24]">
                                            {app.first_name} {app.last_name} ({app.email})
                                        </option>
                                    ))}
                                </select>
                                {/* Custom Chevron for Select */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <svg className="h-5 w-5 text-[#A2A1A8]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            {errors.applicant_id && (
                                <p className="mt-2 text-sm text-red-500">{errors.applicant_id.message}</p>
                            )}
                        </div>

                        {/* Position Title */}
                        <div className="sm:col-span-1">
                            <label htmlFor="position" className="block text-sm font-medium text-[#16151C] dark:text-white mb-2">
                                Position Title
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Briefcase className="h-5 w-5 text-[#A2A1A8]" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    id="position"
                                    placeholder="e.g. Senior Developer"
                                    {...register('position_title', { required: 'Position title is required' })}
                                    className="block w-full rounded-[10px] border border-[rgba(162,161,168,0.2)] bg-transparent py-3 pl-10 pr-10 text-[#16151C] dark:text-white placeholder:text-[#A2A1A8] focus:border-[#7152F3] focus:ring-1 focus:ring-[#7152F3] sm:text-sm font-light"
                                />
                            </div>
                            {errors.position_title && (
                                <p className="mt-2 text-sm text-red-500">{errors.position_title.message}</p>
                            )}
                        </div>

                        {/* Salary */}
                        <div className="sm:col-span-1">
                            <label htmlFor="salary" className="block text-sm font-medium text-[#16151C] dark:text-white mb-2">
                                Salary Rate
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-5 w-5 text-[#A2A1A8]" aria-hidden="true" />
                                </div>
                                <input
                                    type="number"
                                    id="salary"
                                    placeholder="0.00"
                                    {...register('salary', { required: 'Salary is required', min: 0 })}
                                    className="block w-full rounded-[10px] border border-[rgba(162,161,168,0.2)] bg-transparent py-3 pl-10 pr-10 text-[#16151C] dark:text-white placeholder:text-[#A2A1A8] focus:border-[#7152F3] focus:ring-1 focus:ring-[#7152F3] sm:text-sm font-light"
                                />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div className="sm:col-span-2">
                            <label htmlFor="start_date" className="block text-sm font-medium text-[#16151C] dark:text-white mb-2">
                                Start Date
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Calendar className="h-5 w-5 text-[#A2A1A8]" aria-hidden="true" />
                                </div>
                                <input
                                    type="date"
                                    id="start_date"
                                    {...register('start_date', { required: 'Start date is required' })}
                                    className="block w-full rounded-[10px] border border-[rgba(162,161,168,0.2)] bg-transparent py-3 pl-10 pr-10 text-[#16151C] dark:text-white placeholder:text-[#A2A1A8] focus:border-[#7152F3] focus:ring-1 focus:ring-[#7152F3] sm:text-sm font-light"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-x-4 pt-6 border-t border-[rgba(162,161,168,0.1)]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/offers')}
                            className="h-11 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 px-6 bg-[#7152F3] hover:bg-[#5E43D8] text-white"
                        >
                            {loading ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Offer
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
