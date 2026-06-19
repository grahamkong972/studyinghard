import { useState } from 'react';
import { X, BookOpen, Brain, PenTool, Edit2, Trash2 } from 'lucide-react';
import { getCardStatus } from '../../utils/cardUtils';
import FormattedText from '../FormattedText';

const ManageModal = ({ type, items, onClose, onDeleteItem, onDeleteAll, onUpdateItem }) => {
    const [search, setSearch] = useState('');
    const [editingIndex, setEditingIndex] = useState(null);
    const [editDraft, setEditDraft] = useState({});

    const filtered = search.trim()
        ? items.map((item, i) => ({ item, i })).filter(({ item }) => item.q?.toLowerCase().includes(search.toLowerCase()))
        : items.map((item, i) => ({ item, i }));

    const openEdit = (i, item) => { setEditingIndex(i); setEditDraft({ ...item, options: item.options ? [...item.options] : [] }); };
    const closeEdit = () => setEditingIndex(null);
    const saveEdit = () => { onUpdateItem(editingIndex, editDraft); closeEdit(); };

    const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none";

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {type === 'flashcards' ? <BookOpen className="text-indigo-500"/> : (type === 'saq' ? <PenTool className="text-purple-500"/> : <Brain className="text-emerald-500"/>)}
                        Manage {type === 'flashcards' ? 'Flashcards' : (type === 'saq' ? 'SAQs' : 'Quiz Questions')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
                </div>
                <div className="px-4 pt-3 pb-1 border-b border-slate-100">
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); closeEdit(); }}
                        placeholder="Search questions..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scroll">
                    {filtered.length === 0 ? <div className="text-center text-slate-400 py-12">{search ? 'No matches found.' : 'No items to show.'}</div> : (
                        <div className="space-y-2">
                            {filtered.map(({ item, i }) => (
                                <div key={i} className={`p-3 bg-slate-50 rounded-lg border transition ${editingIndex === i ? 'border-indigo-300' : 'border-slate-100 hover:border-slate-300'} group`}>
                                    {editingIndex === i ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Question</p>
                                            <textarea rows={2} value={editDraft.q || ''} onChange={e => setEditDraft(d => ({ ...d, q: e.target.value }))} className={fieldClass}/>

                                            {type === 'flashcards' && <>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Answer</p>
                                                <textarea rows={3} value={editDraft.a || ''} onChange={e => setEditDraft(d => ({ ...d, a: e.target.value }))} className={fieldClass}/>
                                            </>}

                                            {type === 'quiz' && <>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Options — click letter to mark correct</p>
                                                {[0,1,2,3].map(idx => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <button onClick={() => setEditDraft(d => ({ ...d, correct: idx }))}
                                                            className={`w-6 h-6 rounded-full text-xs font-bold shrink-0 transition ${editDraft.correct === idx ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-emerald-100'}`}>
                                                            {String.fromCharCode(65 + idx)}
                                                        </button>
                                                        <input value={editDraft.options?.[idx] || ''} onChange={e => setEditDraft(d => {
                                                            const opts = [...(d.options || ['','','',''])];
                                                            opts[idx] = e.target.value;
                                                            return { ...d, options: opts };
                                                        })} className={fieldClass + ' py-1.5'}/>
                                                    </div>
                                                ))}
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Explanation (optional)</p>
                                                <textarea rows={2} value={editDraft.explanation || ''} onChange={e => setEditDraft(d => ({ ...d, explanation: e.target.value }))} placeholder="Explanation..." className={fieldClass}/>
                                            </>}

                                            {type === 'saq' && <>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Model Answer</p>
                                                <textarea rows={3} value={editDraft.model || ''} onChange={e => setEditDraft(d => ({ ...d, model: e.target.value }))} className={fieldClass}/>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Marks</p>
                                                    <input type="number" min="1" max="20" value={editDraft.marks || 5} onChange={e => setEditDraft(d => ({ ...d, marks: Number(e.target.value) }))} className="w-16 text-center border border-slate-200 rounded-lg py-1 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
                                                </div>
                                            </>}

                                            <div className="flex justify-end gap-2 pt-1">
                                                <button onClick={closeEdit} className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition">Cancel</button>
                                                <button onClick={saveEdit} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                                                {type === 'flashcards' && item.nextReview && <div className={`w-2 h-2 rounded-full ${getCardStatus(item).color.replace('text-', 'bg-').split(' ')[0]}`} title={getCardStatus(item).label}></div>}
                                            </div>
                                            <div className="flex-1 text-sm text-slate-700">
                                                <div className="font-medium mb-1"><FormattedText text={item.q} /></div>
                                                <div className="text-xs text-slate-500 line-clamp-1 opacity-70">
                                                    {type === 'flashcards' ? <FormattedText text={item.a} /> : (type === 'saq' ? 'Model Answer Provided' : 'Multiple Choice')}
                                                </div>
                                            </div>
                                            <button onClick={() => openEdit(i, item)} className="text-slate-400 hover:text-indigo-500 p-1 opacity-0 group-hover:opacity-100 transition" title="Edit"><Edit2 size={15}/></button>
                                            <button onClick={() => onDeleteItem(i)} className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition" title="Delete"><Trash2 size={15}/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between items-center">
                    <span className="text-xs text-slate-500">{filtered.length}{search ? ` of ${items.length}` : ''} items</span>
                    <button onClick={onDeleteAll} className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/> Delete All</button>
                </div>
            </div>
        </div>
    );
};

export default ManageModal;
