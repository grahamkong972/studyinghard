import { useState } from 'react';
import { FileQuestion, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ExamSetupModal = ({ modules, onClose, onStartExam }) => {
    const toast = useToast();
    const [selectedModuleIds, setSelectedModuleIds] = useState(modules.map(m => m.id));
    const [totalMarks, setTotalMarks] = useState(100);
    const [mcqPercentage, setMcqPercentage] = useState(50);
    const [timeLimit, setTimeLimit] = useState(120);

    const saqPercentage = 100 - mcqPercentage;
    const mcqMarks = Math.floor(totalMarks * (mcqPercentage / 100));
    const saqMarks = totalMarks - mcqMarks;
    const numMCQs = mcqMarks;
    const numSAQs = saqMarks > 0 ? Math.max(1, Math.round(saqMarks / 5)) : 0;

    const toggleModule = (id) => {
        setSelectedModuleIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleStart = () => {
        if (selectedModuleIds.length === 0) return toast("Select at least one module.");
        onStartExam({
            moduleIds: selectedModuleIds,
            numMCQs,
            numSAQs,
            timeLimit
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                    <FileQuestion className="text-red-500"/> Exam Configuration
                </h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Marks</label>
                            <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} className="w-full p-2 border rounded-lg font-mono"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time (Mins)</label>
                            <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full p-2 border rounded-lg font-mono"/>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-emerald-600">{mcqPercentage}% MCQ ({numMCQs} Qs)</span>
                            <span className="text-purple-600">{saqPercentage}% SAQ (~{numSAQs} Qs)</span>
                        </div>
                        <input type="range" min="0" max="100" step="10" value={mcqPercentage} onChange={(e) => setMcqPercentage(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Include Modules</label>
                        <div className="max-h-40 overflow-y-auto border rounded-lg custom-scroll">
                            {modules.map(m => (
                                <div key={m.id} onClick={() => toggleModule(m.id)} className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 ${selectedModuleIds.includes(m.id) ? 'bg-indigo-50' : ''}`}>
                                    <span className="text-sm font-medium text-slate-700 truncate pr-2">{m.title}</span>
                                    {selectedModuleIds.includes(m.id) && <CheckCircle size={16} className="text-indigo-600 shrink-0"/>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm">Cancel</button>
                        <button onClick={handleStart} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-bold flex items-center gap-2">Start Exam</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamSetupModal;
