import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { TYPE_LABEL } from '../../utils/constants';

const AnalysisModal = ({ analysis, type, count, onConfirm, onClose }) => {
    const label = TYPE_LABEL[type] || type;
    const topics = Array.isArray(analysis?.topics) ? analysis.topics.slice(0, 8) : [];
    const thinAreas = Array.isArray(analysis?.thinAreas) ? analysis.thinAreas.slice(0, 4) : [];
    const estimated = typeof analysis?.estimatedUnique === 'number' ? analysis.estimatedUnique : null;
    const recommendation = analysis?.recommendation || '';

    const [localCount, setLocalCount] = useState(count);
    const [emphasized, setEmphasized] = useState(new Set());
    const toggleTopic = (t) => setEmphasized(prev => {
        const next = new Set(prev);
        next.has(t) ? next.delete(t) : next.add(t);
        return next;
    });

    const overCapacity = estimated !== null && localCount > estimated;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-500"/> Content Analysis
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[60vh] custom-scroll">
                    {topics.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Topics detected</p>
                            <div className="flex flex-wrap gap-2">
                                {topics.map((t, i) => (
                                    <button key={i} onClick={() => toggleTopic(t)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${emphasized.has(t) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Click topics to emphasize them in generation</p>
                        </div>
                    )}

                    {thinAreas.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Thin coverage</p>
                            <ul className="space-y-1">
                                {thinAreas.map((t, i) => (
                                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-slate-600">
                            {estimated !== null
                                ? <>Notes can support up to <strong>~{estimated}</strong> unique {label}s</>
                                : <>How many {label}s to generate?</>}
                        </p>
                        <input type="number" min="1" value={localCount}
                            onChange={e => setLocalCount(Math.max(1, Number(e.target.value)))}
                            className="w-16 text-center border border-slate-300 rounded-lg py-1 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none ml-3"/>
                    </div>
                    {overCapacity && (
                        <p className="text-xs text-orange-600">Requesting more than estimated capacity — some cards may be repetitive.</p>
                    )}

                    {recommendation && (
                        <p className="text-sm text-slate-500 italic">{recommendation}</p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition text-sm">Cancel</button>
                    <button onClick={() => onConfirm({ finalCount: localCount, emphasizedTopics: [...emphasized] })}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-sm flex items-center gap-2">
                        <Sparkles size={15}/> Generate {localCount} {label}s
                        {emphasized.size > 0 && <span className="text-indigo-200 text-xs font-normal">· {emphasized.size} focus</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;
