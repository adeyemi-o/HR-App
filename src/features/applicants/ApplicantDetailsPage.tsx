import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApplicantDetails } from '@/hooks/useApplicantDetails';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, FileText, Calendar, Shield, AlertCircle, CheckCircle, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ApplicantDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: applicant, isLoading, error } = useApplicantDetails(id);

    // Offer Modal State
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [offerForm, setOfferForm] = useState({
        position: '',
        salary: '',
        startDate: ''
    });

    // Document Viewer State
    const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string } | null>(null);

    // Request Loading State
    const [requestLoading, setRequestLoading] = useState<Record<string, boolean>>({});

    const handleRequestRequirement = async (reqKey: string, reqLabel: string, formUrl: string) => {
        if (!applicant) return;

        if (!formUrl) {
            alert('Form URL not found for this requirement.');
            return;
        }

        const email = getAnswer('email');
        if (!email || email === 'N/A' || !email.includes('@')) {
            alert('Valid applicant email is required to send a request.');
            return;
        }

        setRequestLoading(prev => ({ ...prev, [reqKey]: true }));
        try {
            const fullNameAnswer = applicant.answers?.fullName;
            const firstName = fullNameAnswer?.first || applicant.answers?.['q3_fullName']?.first || 'Unknown';
            const lastName = fullNameAnswer?.last || applicant.answers?.['q3_fullName']?.last || 'Applicant';
            const name = `${firstName} ${lastName}`;

            const { error } = await supabase.functions.invoke('sendRequirementRequest', {
                body: {
                    email: email,
                    name: name,
                    formName: reqLabel,
                    formUrl: formUrl
                }
            });

            if (error) {
                console.error('Request Error Response:', error);
                let errorMessage = error.message || 'Unknown error occurred';
                try {
                    const parsed = JSON.parse(error.message);
                    if (parsed.error) errorMessage = parsed.error;
                } catch (e) { /* ignore */ }
                throw new Error(errorMessage);
            }

            alert(`Request for ${reqLabel} sent successfully!`);
        } catch (err: any) {
            console.error('Request Error:', err);
            alert('Failed to send request: ' + err.message);
        } finally {
            setRequestLoading(prev => ({ ...prev, [reqKey]: false }));
        }
    };

    if (isLoading) return <div className="p-8 text-center text-[#A2A1A8]">Loading applicant details...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Failed to load applicant: {error.message}</div>;
    if (!applicant) return <div className="p-8 text-center text-[#A2A1A8]">Applicant not found</div>;

    // Helper to extract answer safely
    const getAnswer = (key: string) => applicant.answers?.[key] || 'N/A';

    const handleSendOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        setOfferLoading(true);
        try {
            // Safely extract names
            const fullNameAnswer = applicant.answers?.fullName;
            // Handle case where fullName might be the string "N/A" from getAnswer or missing
            const firstName = fullNameAnswer?.first || applicant.answers?.['q3_fullName']?.first || 'Unknown';
            const lastName = fullNameAnswer?.last || applicant.answers?.['q3_fullName']?.last || 'Applicant';

            const payload = {
                jotformSubmissionId: applicant.id,
                email: getAnswer('email'),
                firstName: firstName,
                lastName: lastName,
                position: offerForm.position,
                salary: parseFloat(offerForm.salary),
                startDate: offerForm.startDate
            };
            console.log('Sending Offer Payload:', payload);

            const { data, error } = await supabase.functions.invoke('sendOffer', {
                body: payload
            });

            if (error) {
                console.error('Send Offer Error Response:', error);
                // Try to parse the error message if it's a JSON string
                let errorMessage = error.message;
                try {
                    const parsed = JSON.parse(error.message);
                    if (parsed.error) errorMessage = parsed.error;
                } catch (e) { /* ignore */ }
                throw new Error(errorMessage);
            }

            console.log('Offer Sent Success:', data);
            alert('Offer sent successfully!');
            setShowOfferModal(false);
        } catch (err: any) {
            console.error('Handle Send Offer Exception:', err);
            alert('Failed to send offer: ' + err.message);
        } finally {
            setOfferLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/applicants')}
                    className="p-2 hover:bg-[rgba(162,161,168,0.1)] rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[#16151C] dark:text-white" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[#16151C] dark:text-white">
                        {getAnswer('fullName')?.first} {getAnswer('fullName')?.last}
                    </h1>
                    <p className="text-[#A2A1A8] font-light">Applicant Profile</p>
                </div>
                <div className="ml-auto">
                    <StatusBadge status={applicant.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                        <h2 className="text-lg font-semibold text-[#16151C] dark:text-white mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-[#7152F3]" />
                            Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-[#A2A1A8] uppercase tracking-wider">Email</label>
                                <div className="flex items-center gap-2 mt-1 text-[#16151C] dark:text-white">
                                    <Mail size={16} className="text-[#A2A1A8]" />
                                    {getAnswer('email')}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#A2A1A8] uppercase tracking-wider">Phone</label>
                                <div className="flex items-center gap-2 mt-1 text-[#16151C] dark:text-white">
                                    <Phone size={16} className="text-[#A2A1A8]" />
                                    {getAnswer('phoneNumber')?.full || getAnswer('phoneNumber')}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#A2A1A8] uppercase tracking-wider">Position Applied</label>
                                <div className="mt-1 text-[#16151C] dark:text-white">
                                    {getAnswer('positionApplied')}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#A2A1A8] uppercase tracking-wider">Date Applied</label>
                                <div className="flex items-center gap-2 mt-1 text-[#16151C] dark:text-white">
                                    <Calendar size={16} className="text-[#A2A1A8]" />
                                    {format(new Date(applicant.created_at), 'MMM d, yyyy')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents & Forms Status */}
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                        <h2 className="text-lg font-semibold text-[#16151C] dark:text-white mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-[#7152F3]" />
                            Requirements
                        </h2>
                        <div className="space-y-4">
                            {[
                                { key: 'emergency_contact', label: 'Emergency Contact Form' },
                                { key: 'i9_eligibility', label: 'I-9 Eligibility Form' },
                                { key: 'vaccination', label: 'Vaccination Form' },
                                { key: 'licenses', label: 'Licenses & Certifications' },
                                { key: 'background_check', label: 'Background Check' }
                            ].map((req) => {
                                const submission = applicant[req.key as keyof typeof applicant];
                                const isSubmitted = !!submission?.id;

                                return (
                                    <div key={req.key} className="flex items-center justify-between p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px]">
                                        <div className="flex items-center gap-3">
                                            {isSubmitted ? (
                                                <CheckCircle size={20} className="text-green-500" />
                                            ) : (
                                                <AlertCircle size={20} className="text-orange-500" />
                                            )}
                                            <div>
                                                <p className="text-[#16151C] dark:text-white font-medium">{req.label}</p>
                                                <p className="text-xs text-[#A2A1A8]">
                                                    {isSubmitted
                                                        ? `Submitted on ${new Date(submission.created_at).toLocaleDateString()}`
                                                        : 'Not submitted yet'}
                                                </p>
                                            </div>
                                        </div>
                                        {isSubmitted ? (
                                            <button
                                                onClick={() => setViewingDoc({ url: submission.url, title: req.label })}
                                                className="text-[#7152F3] text-sm hover:underline flex items-center gap-1"
                                            >
                                                View <ExternalLink size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRequestRequirement(req.key, req.label, submission?.formUrl)}
                                                disabled={requestLoading[req.key]}
                                                className="text-[#7152F3] text-sm hover:underline disabled:opacity-50"
                                            >
                                                {requestLoading[req.key] ? 'Sending...' : 'Request'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Actions */}
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                        <h2 className="text-lg font-semibold text-[#16151C] dark:text-white mb-4">Actions</h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setOfferForm(prev => ({ ...prev, position: getAnswer('positionApplied') || '' }));
                                    setShowOfferModal(true);
                                }}
                                className="w-full px-4 py-2 bg-[#22C55E] text-white rounded-[10px] hover:bg-[rgba(34,197,94,0.9)] transition-colors font-light"
                            >
                                Send Offer
                            </button>
                            <button className="w-full px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                Advance Status
                            </button>
                            <button className="w-full px-4 py-2 bg-[#EF4444] text-white rounded-[10px] hover:bg-[rgba(239,68,68,0.9)] transition-colors font-light">
                                Reject Applicant
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-card w-full max-w-md rounded-[20px] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-[#16151C] dark:text-white">Send Offer</h3>
                            <button onClick={() => setShowOfferModal(false)} className="text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendOffer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#16151C] dark:text-white mb-1">Position Title</label>
                                <input
                                    type="text"
                                    required
                                    value={offerForm.position}
                                    onChange={e => setOfferForm(prev => ({ ...prev, position: e.target.value }))}
                                    className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#16151C] dark:text-white mb-1">Annual Salary / Hourly Rate</label>
                                <input
                                    type="number"
                                    required
                                    value={offerForm.salary}
                                    onChange={e => setOfferForm(prev => ({ ...prev, salary: e.target.value }))}
                                    className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#16151C] dark:text-white mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={offerForm.startDate}
                                    onChange={e => setOfferForm(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOfferModal(false)}
                                    className="flex-1 px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] text-[#16151C] dark:text-white hover:bg-[rgba(162,161,168,0.05)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={offerLoading}
                                    className="flex-1 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] disabled:opacity-50"
                                >
                                    {offerLoading ? 'Sending...' : 'Send Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white dark:bg-[#1C1C24] w-full h-full max-w-6xl rounded-xl overflow-hidden flex flex-col relative">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-semibold text-[#16151C] dark:text-white">{viewingDoc.title}</h3>
                            <button
                                onClick={() => setViewingDoc(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X size={24} className="text-[#16151C] dark:text-white" />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative">
                            <iframe
                                src={viewingDoc.url}
                                className="w-full h-full border-0"
                                title={viewingDoc.title}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
