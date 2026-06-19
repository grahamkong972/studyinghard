import { useState } from 'react';
import { X, Folder, Sparkles, Brain, PenTool, PieChart } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, onUpgrade }) => {
    const [upgradeCode, setUpgradeCode] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleUpgradeClick = (e) => {
        e.preventDefault();
        setError("");
        if (!upgradeCode.trim()) {
            return setError("Please enter the upgrade code.");
        }
        onUpgrade(upgradeCode);
    };

    const features = [
        { icon: <Folder size={20} className="text-red-500"/>, free: '1 Subject/Folder', pro: 'Unlimited Subjects/Folders', key: 'subjects' },
        { icon: <Sparkles size={20} className="text-amber-500"/>, free: 'Limited AI Credits (180/mo)', pro: 'Boosted AI Credits (3000/mo)', key: 'credits' },
        { icon: <Brain size={20} className="text-indigo-500"/>, free: 'Standard Flashcard & Quiz', pro: 'Smart Spaced Repetition (SRS)', key: 'srs' },
        { icon: <PenTool size={20} className="text-purple-500"/>, free: 'Manual SAQ Grading', pro: 'AI Short Answer Grading', key: 'saq-grade' },
        { icon: <PieChart size={20} className="text-emerald-500"/>, free: 'No Syllabus Analysis', pro: 'Syllabus Coverage Analysis', key: 'analysis' },
    ];
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2">🚀 Upgrade to Pro</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-800 mb-2">Free Plan</h4>
                            <p className="text-sm text-slate-500 mb-6">A great start for hobbyists learning a single subject.</p>
                            <div className="flex-1 space-y-4">
                                {features.map((f) => (
                                    <div key={f.key} className="flex items-start gap-3">
                                        {f.icon}
                                        <span className="text-sm text-slate-700">{f.free}</span>
                                    </div>
                                ))}
                            </div>
                            <button disabled className="mt-6 w-full py-3 bg-slate-300 text-slate-600 font-bold rounded-lg text-lg">Current Plan</button>
                        </div>
                        <div className="bg-white p-6 rounded-xl border-4 border-amber-400 shadow-xl flex flex-col">
                            <div className="self-end px-3 py-1 bg-amber-400 text-white text-xs font-bold rounded-full mb-2">BEST VALUE</div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">Pro Plan</h4>
                            <p className="text-sm text-slate-500 mb-6">Unleash the full power of the AI tutor for your academic career.</p>
                            <div className="flex-1 space-y-4">
                                {features.map((f) => (
                                    <div key={f.key} className="flex items-start gap-3">
                                        {f.icon}
                                        <span className="text-sm font-bold text-slate-800">{f.pro}</span>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleUpgradeClick} className="mt-6 flex flex-col items-center">
                                <span className="text-4xl font-extrabold text-slate-800">$33.99</span>
                                <span className="text-sm text-slate-500 mb-4">per month</span>
                                <input
                                    type="text"
                                    placeholder="Enter Upgrade Code..."
                                    value={upgradeCode}
                                    onChange={(e) => setUpgradeCode(e.target.value)}
                                    className="w-full p-3 border border-amber-300 rounded-lg text-sm text-slate-700 font-mono mb-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                                {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                                <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-lg transition">Validate & Upgrade</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
