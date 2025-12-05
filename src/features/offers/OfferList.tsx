import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { offerService } from '@/services/offerService';
import { employeeService } from '@/services/employeeService';
import type { Offer } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Eye, Edit, FileText, Send, UserCheck, Trash2 } from 'lucide-react';
import { SlideOver } from '@/components/ui/SlideOver';

type OfferTab = 'Draft' | 'Pending Approval' | 'Sent' | 'Accepted' | 'Declined';

export function OfferList() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const navigate = useNavigate();

    // UI States
    const [activeTab, setActiveTab] = useState<OfferTab>('Pending Approval');
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

    const tabs: OfferTab[] = ['Draft', 'Pending Approval', 'Sent', 'Accepted', 'Declined'];

    useEffect(() => {
        loadOffers();
    }, []);

    const loadOffers = async () => {
        try {
            const data = await offerService.getOffers();
            setOffers(data);
        } catch (err) {
            setError('Failed to load offers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (offer: Offer) => {
        if (!confirm(`Are you sure you want to send this offer to ${offer.applicant?.first_name}?`)) return;

        setProcessingId(offer.id);
        try {
            await offerService.updateStatus(offer.id, 'Sent');
            await loadOffers();
            alert('Offer sent successfully!');
            setSelectedOffer(null); // Close drawer if open
        } catch (err) {
            alert('Failed to send offer.');
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleOnboard = async (offer: Offer) => {
        if (!confirm(`Are you sure you want to onboard ${offer.applicant?.first_name}? This will create an employee record.`)) return;

        setProcessingId(offer.id);
        try {
            await employeeService.createEmployeeFromApplicant(offer.applicant_id, {
                position: offer.position_title,
                start_date: offer.start_date,
                salary: offer.salary
            });
            alert('Employee onboarded successfully!');
            navigate('/employees');
        } catch (err) {
            alert('Failed to onboard employee.');
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (offer: Offer) => {
        if (!confirm(`Are you sure you want to delete this offer for ${offer.applicant?.first_name} ${offer.applicant?.last_name}? This action cannot be undone.`)) return;

        setProcessingId(offer.id);
        try {
            await offerService.deleteOffer(offer.id);
            await loadOffers();
            alert('Offer deleted successfully!');
            setSelectedOffer(null);
        } catch (err) {
            alert('Failed to delete offer.');
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleEdit = (offerId: string) => {
        navigate(`/offers/${offerId}/edit`);
    };

    const filteredOffers = offers.filter(offer => {
        // Map database status to tab status if needed, or assume they match
        // Assuming 'Pending' in DB maps to 'Pending Approval' tab
        if (activeTab === 'Pending Approval' && offer.status === 'Pending_Approval') return true;
        return offer.status === activeTab;
    });

    if (loading) return <div className="p-8 text-center text-[#A2A1A8]">Loading offers...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[#16151C] dark:text-white font-semibold text-xl">Offers</h1>
                    <p className="text-[#A2A1A8] font-light text-sm">Manage offer letters and approvals</p>
                </div>
                <button
                    onClick={() => navigate('/offers/new')}
                    className="px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light"
                >
                    Create New Offer
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)]">
                <div className="border-b border-[rgba(162,161,168,0.1)]">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => {
                            const count = offers.filter(o => {
                                if (tab === 'Pending Approval' && o.status === 'Pending_Approval') return true;
                                return o.status === tab;
                            }).length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-4 border-b-2 transition-colors whitespace-nowrap font-light ${activeTab === tab
                                        ? 'border-[#7152F3] text-[#7152F3] font-semibold'
                                        : 'border-transparent text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white hover:border-[rgba(162,161,168,0.2)]'
                                        }`}
                                >
                                    {tab} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Offers List */}
                <div className="divide-y divide-[rgba(162,161,168,0.05)]">
                    {filteredOffers.length > 0 ? (
                        filteredOffers.map((offer) => (
                            <div
                                key={offer.id}
                                className="p-6 hover:bg-[rgba(113,82,243,0.02)] transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-[#16151C] dark:text-white">
                                                {offer.applicant?.first_name} {offer.applicant?.last_name}
                                            </h4>
                                            <StatusBadge status={offer.status} size="sm" />
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-[#A2A1A8]">Position:</span>
                                                <span className="text-[#16151C] dark:text-white ml-2">{offer.position_title}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#A2A1A8]">Pay Rate:</span>
                                                <span className="text-[#16151C] dark:text-white ml-2">${offer.salary.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#A2A1A8]">Start Date:</span>
                                                <span className="text-[#16151C] dark:text-white ml-2">
                                                    {format(new Date(offer.start_date), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[#A2A1A8]">Created By:</span>
                                                <span className="text-[#16151C] dark:text-white ml-2">HR Admin</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#A2A1A8] mt-2">
                                            Last updated: {format(new Date(offer.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => setSelectedOffer(offer)}
                                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 font-light"
                                        >
                                            <Eye size={16} />
                                            Preview
                                        </button>
                                        {(offer.status === 'Draft' || offer.status === 'Pending_Approval') && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(offer.id)}
                                                    className="px-4 py-2 bg-white dark:bg-card border border-[rgba(162,161,168,0.2)] text-[#16151C] dark:text-white rounded-lg hover:bg-[rgba(162,161,168,0.05)] transition-colors flex items-center gap-2 font-light"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(offer)}
                                                    disabled={processingId === offer.id}
                                                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 font-light"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <FileText className="mx-auto text-[#A2A1A8] mb-4" size={48} strokeWidth={1} />
                            <p className="text-[#A2A1A8] font-light">No offers in this category</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Offer Preview Drawer */}
            <SlideOver
                isOpen={!!selectedOffer}
                onClose={() => setSelectedOffer(null)}
                title="Offer Preview"
                width="xl"
            >
                {selectedOffer && (
                    <div className="space-y-6">
                        {/* Offer Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-[rgba(162,161,168,0.1)]">
                            <div>
                                <p className="text-sm text-[#A2A1A8] mb-1">Applicant</p>
                                <p className="text-[#16151C] dark:text-white">
                                    {selectedOffer.applicant?.first_name} {selectedOffer.applicant?.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-[#A2A1A8] mb-1">Position</p>
                                <p className="text-[#16151C] dark:text-white">{selectedOffer.position_title}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#A2A1A8] mb-1">Pay Rate</p>
                                <p className="text-[#16151C] dark:text-white">${selectedOffer.salary.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#A2A1A8] mb-1">Start Date</p>
                                <p className="text-[#16151C] dark:text-white">
                                    {format(new Date(selectedOffer.start_date), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>

                        {/* PDF Preview Mockup */}
                        <div className="border-2 border-[rgba(162,161,168,0.1)] rounded-lg p-8 bg-white dark:bg-card min-h-[600px]">
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-[#16151C] dark:text-white text-xl font-serif mb-2">Prolific Homecare LLC</h2>
                                    <p className="text-[#A2A1A8] font-light">Employment Offer Letter</p>
                                </div>

                                <div className="space-y-4 text-[#16151C] dark:text-[#A2A1A8] font-light leading-relaxed">
                                    <p>Dear {selectedOffer.applicant?.first_name},</p>

                                    <p>
                                        We are pleased to offer you the position of <strong className="font-semibold">{selectedOffer.position_title}</strong> at
                                        Prolific Homecare LLC. We believe your skills and experience will be a valuable
                                        addition to our team.
                                    </p>

                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-6 my-6">
                                        <h4 className="text-[#16151C] dark:text-white font-medium mb-4">Offer Details</h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-[#A2A1A8]">Position:</span>
                                                <span className="text-[#16151C] dark:text-white font-medium">{selectedOffer.position_title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#A2A1A8]">Pay Rate:</span>
                                                <span className="text-[#16151C] dark:text-white font-medium">${selectedOffer.salary.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#A2A1A8]">Start Date:</span>
                                                <span className="text-[#16151C] dark:text-white font-medium">
                                                    {format(new Date(selectedOffer.start_date), 'MMMM d, yyyy')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#A2A1A8]">Employment Type:</span>
                                                <span className="text-[#16151C] dark:text-white font-medium">Full-time</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p>
                                        This position reports to the Director of Nursing and will be based at our
                                        main facility. Your primary responsibilities will include providing direct
                                        patient care and maintaining accurate documentation.
                                    </p>

                                    <p>
                                        Benefits include health insurance, paid time off, and continuing education
                                        opportunities. Please review the attached benefits guide for complete details.
                                    </p>

                                    <p>
                                        To accept this offer, please sign and return this letter by {format(new Date(selectedOffer.start_date), 'MMMM d, yyyy')}.
                                        We look forward to welcoming you to our team.
                                    </p>

                                    <div className="mt-12 pt-8 border-t border-[rgba(162,161,168,0.1)]">
                                        <p>Sincerely,</p>
                                        <p className="mt-4 font-signature text-xl">Jane Wilson</p>
                                        <p className="text-sm text-[#A2A1A8]">HR Director</p>
                                        <p className="text-sm text-[#A2A1A8]">Prolific Homecare LLC</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4 border-t border-[rgba(162,161,168,0.1)]">
                            <div className="flex gap-3">
                                {(selectedOffer.status === 'Pending_Approval' || selectedOffer.status === 'Draft') && (
                                    <>
                                        <button
                                            onClick={() => handleSend(selectedOffer)}
                                            disabled={processingId === selectedOffer.id}
                                            className="flex-1 px-4 py-3 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light flex items-center justify-center gap-2"
                                        >
                                            <Send size={18} />
                                            {processingId === selectedOffer.id ? 'Sending...' : 'Approve & Send Offer'}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(selectedOffer.id)}
                                            className="px-4 py-3 bg-white dark:bg-card border border-[rgba(162,161,168,0.2)] text-[#16151C] dark:text-white rounded-[10px] hover:bg-[rgba(162,161,168,0.05)] transition-colors font-light flex items-center gap-2"
                                        >
                                            <Edit size={18} />
                                            Edit
                                        </button>
                                    </>
                                )}
                                {selectedOffer.status === 'Accepted' && (
                                    <button
                                        onClick={() => handleOnboard(selectedOffer)}
                                        disabled={processingId === selectedOffer.id || selectedOffer.applicant?.status === 'Hired'}
                                        className={`flex-1 px-4 py-3 text-white rounded-[10px] transition-colors font-light flex items-center justify-center gap-2 ${selectedOffer.applicant?.status === 'Hired'
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-[#22C55E] hover:bg-[rgba(34,197,94,0.9)]'
                                            }`}
                                    >
                                        <UserCheck size={18} />
                                        {selectedOffer.applicant?.status === 'Hired' ? 'Already Onboarded' : 'Onboard Employee'}
                                    </button>
                                )}
                                {(selectedOffer.status === 'Sent' || selectedOffer.status === 'Accepted') && (
                                    <button className="flex-1 px-4 py-3 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                        Download PDF
                                    </button>
                                )}
                            </div>
                            {(selectedOffer.status === 'Draft' || selectedOffer.status === 'Pending_Approval' || selectedOffer.status === 'Declined') && (
                                <button
                                    onClick={() => handleDelete(selectedOffer)}
                                    disabled={processingId === selectedOffer.id}
                                    className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[10px] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-light flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30"
                                >
                                    <Trash2 size={18} />
                                    {processingId === selectedOffer.id ? 'Deleting...' : 'Delete Offer'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
