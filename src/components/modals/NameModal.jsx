import { useState, useEffect, useRef } from 'react';

const NameModal = ({ isOpen, type, initialValue, onClose, onSave }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef(null);
    useEffect(() => { if (isOpen) { setValue(initialValue); setTimeout(() => inputRef.current?.focus(), 100); } }, [isOpen, initialValue]);
    if (!isOpen) return null;
    const handleSubmit = (e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()); };
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">{type === 'create' ? 'New Folder' : 'Rename Folder'}</h3>
                <form onSubmit={handleSubmit}>
                    <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4 text-slate-800" placeholder="Folder Name"/>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-bold">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NameModal;
