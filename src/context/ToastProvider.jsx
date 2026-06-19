import { useState, useCallback, useRef } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { ToastContext } from './ToastContext';

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // toast(message)                      → red error
    // toast(message, 'success')           → green
    // toast(message, 'info', undoFn)      → slate with Undo button (5s)
    const toast = useCallback((message, type = 'error', onUndo = null) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, onUndo }]);
        timers.current[id] = setTimeout(() => dismiss(id), onUndo ? 5000 : 4000);
    }, [dismiss]);

    const bgClass = (type) => type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-emerald-500' : 'bg-slate-800';
    const Icon = (type) => type === 'error' ? <XCircle size={15} className="shrink-0" /> : <CheckCircle size={15} className="shrink-0" />;

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in-up pointer-events-auto max-w-sm ${bgClass(t.type)}`}>
                        {Icon(t.type)}
                        <span className="flex-1">{t.message}</span>
                        {t.onUndo && (
                            <button onClick={() => { t.onUndo(); dismiss(t.id); }} className="ml-2 font-bold underline underline-offset-2 text-xs opacity-80 hover:opacity-100 shrink-0">
                                Undo
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
