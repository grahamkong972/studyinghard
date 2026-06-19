import { useState } from 'react';
import { X, ClipboardPaste, AlertCircle, CheckCircle, BookOpen, Brain, PenTool } from 'lucide-react';
import { parsePastedCards } from '../../utils/pasteParser';
import { FORMAT_HINTS } from '../../utils/constants';

const PasteImportModal = ({ onClose, onImport, initialType = 'flashcards' }) => {
    const [type, setType] = useState(initialType);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    const handleParse = () => {
        setError('');
        setPreview(null);
        try {
            const cards = parsePastedCards(text, type);
            if (cards.length === 0) { setError('No cards found.'); return; }
            setPreview(cards);
        } catch (e) {
            setError(e.message);
        }
    };

    const handleImport = () => {
        if (!preview) return;
        onImport(type, preview);
        onClose();
    };

    const typeConfig = {
        flashcards: { label: 'Flashcards', icon: <BookOpen size={14}/>, activeClass: 'border-indigo-500 text-indigo-600 bg-indigo-50/50' },
        quiz:       { label: 'Quiz (MCQ)', icon: <Brain size={14}/>,    activeClass: 'border-emerald-500 text-emerald-600 bg-emerald-50/50' },
        saq:        { label: 'SAQ',        icon: <PenTool size={14}/>,  activeClass: 'border-purple-500 text-purple-600 bg-purple-50/50' },
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ClipboardPaste size={20} className="text-indigo-500"/> Paste &amp; Import Cards
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
                </div>

                {/* Type tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    {Object.entries(typeConfig).map(([key, c]) => (
                        <button key={key} onClick={() => { setType(key); setText(''); setPreview(null); setError(''); }}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${type === key ? c.activeClass : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
                    {/* Format hint */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Format</div>
                        <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono">{FORMAT_HINTS[type]}</pre>
                    </div>

                    <textarea
                        className="w-full h-52 p-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 resize-none"
                        placeholder="Paste your cards here..."
                        value={text}
                        onChange={e => { setText(e.target.value); setPreview(null); setError(''); }}
                    />

                    {error && (
                        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle size={15} className="shrink-0 mt-0.5"/> {error}
                        </div>
                    )}

                    {preview && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
                                <CheckCircle size={13}/> {preview.length} card{preview.length !== 1 ? 's' : ''} ready to import
                            </div>
                            <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll">
                                {preview.map((c, i) => (
                                    <div key={i} className="text-xs text-emerald-800 bg-white rounded px-2 py-1 border border-emerald-100 truncate">
                                        {i + 1}. {c.q}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm">Cancel</button>
                    {!preview
                        ? <button onClick={handleParse} disabled={!text.trim()} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-sm disabled:opacity-50 flex items-center gap-2"><ClipboardPaste size={15}/> Parse</button>
                        : <button onClick={handleImport} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-sm flex items-center gap-2"><CheckCircle size={15}/> Import {preview.length} Card{preview.length !== 1 ? 's' : ''}</button>
                    }
                </div>
            </div>
        </div>
    );
};

export default PasteImportModal;
