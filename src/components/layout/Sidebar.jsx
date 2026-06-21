import { useState, useEffect } from 'react';
import { GraduationCap, Settings, ChevronDown, ChevronRight, Folder, PieChart, Trash2, Edit2, Plus, X } from 'lucide-react';

const Sidebar = ({ user, folders, decks, activeId, viewMode, onSelectDeck, onSelectFolder, onAddFolder, onDeleteFolder, onRenameFolder, onAddDeck, onDeleteDeck, onSettings, isOpen, onClose }) => {
    const [expandedFolders, setExpandedFolders] = useState({});
    const toggleFolder = (folderId) => setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    useEffect(() => {
        if (viewMode === 'deck' && activeId) {
            const activeDeck = decks.find(d => d.id === activeId);
            if (activeDeck) setExpandedFolders(prev => ({ ...prev, [activeDeck.folderId]: true }));
        } else if (viewMode === 'folder' && activeId) {
            setExpandedFolders(prev => ({ ...prev, [activeId]: true }));
        }
    }, [activeId, viewMode, decks]);

    return (
        <div className={`w-72 bg-slate-900 text-white flex flex-col h-screen fixed md:relative z-30 shadow-xl border-r border-slate-800 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h1 className="font-bold text-lg flex items-center gap-2 truncate"><GraduationCap className="text-indigo-400 flex-shrink-0" /> <span className="truncate">{user?.email || 'Guest'}</span></h1>
                <div className="flex items-center gap-1">
                    <button onClick={onSettings} className="hover:text-indigo-400 transition"><Settings size={18}/></button>
                    <button onClick={onClose} className="md:hidden hover:text-indigo-400 transition ml-1"><X size={18}/></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-6">
                {folders.map(folder => (
                    <div key={folder.id}>
                        <div className="flex items-center justify-between group mb-2 select-none">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-300 transition-colors flex-1 overflow-hidden" onClick={() => toggleFolder(folder.id)}>
                                {expandedFolders[folder.id] ? <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/> : <ChevronRight size={16} className="text-slate-500 flex-shrink-0"/>}
                                <Folder size={16} className="text-indigo-400 fill-indigo-400/20 flex-shrink-0"/>
                                <span className="font-semibold text-sm truncate">{folder.name}</span>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onRenameFolder(folder); }} className="text-slate-500 hover:text-indigo-400 p-1" title="Rename Folder"><Edit2 size={12}/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="text-slate-500 hover:text-red-400 p-1" title="Delete Folder"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        {expandedFolders[folder.id] && (
                            <div className="pl-6 space-y-1 border-l-2 border-slate-800 ml-2.5 transition-all">
                                <div onClick={() => { onSelectFolder(folder.id); onClose(); }} className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all mb-1 ${viewMode === 'folder' && activeId === folder.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                                    <PieChart size={14} />
                                    <div className="truncate text-xs font-medium">Course Overview</div>
                                </div>
                                {decks.filter(d => d.folderId === folder.id).map(deck => (
                                    <div key={deck.id} onClick={() => { onSelectDeck(deck.id); onClose(); }} className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${viewMode === 'deck' && activeId === deck.id ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                                        <div className="truncate text-xs font-medium">{deck.title}</div>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id); }} className={`opacity-0 group-hover:opacity-100 hover:text-red-400 transition ${viewMode === 'deck' && activeId === deck.id ? 'opacity-100' : ''}`}><Trash2 size={12} /></button>
                                    </div>
                                ))}
                                <button onClick={() => onAddDeck(folder.id)} className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-md transition flex items-center gap-2 mt-1"><Plus size={12} /> New Module</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-800 shrink-0">
                <button onClick={onAddFolder} className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition font-medium border border-slate-700"><Plus size={16} /> New Folder</button>
            </div>
        </div>
    );
};

export default Sidebar;
