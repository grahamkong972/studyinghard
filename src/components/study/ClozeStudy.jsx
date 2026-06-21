import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { getCardStatus } from '../../utils/cardUtils';

const ClozeStudy = ({ cards, deck, onUpdateDeck, onBack }) => {
    const [idx, setIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [revealed, setRevealed] = useState(false);
    const [dueQueue, setDueQueue] = useState([]);
    const [currentCard, setCurrentCard] = useState(null);
    const [sessionComplete, setSessionComplete] = useState(false);
    const isSRS = deck.studyMode === 'srs';

    useEffect(() => {
        if (isSRS) {
            const now = Date.now();
            const queue = cards.map((c, i) => ({ ...c, originalIndex: i })).filter(c => !c.nextReview || c.nextReview <= now);
            setDueQueue(queue);
            if (queue.length > 0) setCurrentCard(queue[0]); else setSessionComplete(true);
        } else {
            if (cards.length > 0) setCurrentCard(cards[0]); else setSessionComplete(true);
        }
    }, [isSRS, cards]);

    const handleRate = useCallback((intervalMinutes) => {
        if (!currentCard) return;
        const now = Date.now();
        const nextReview = now + intervalMinutes * 60 * 1000;
        const updatedClozes = [...cards];
        const cardIndex = currentCard.originalIndex;
        if (cardIndex !== undefined) {
            updatedClozes[cardIndex] = { ...cards[cardIndex], nextReview };
            const prevStats = deck.stats || {};
            onUpdateDeck({
                ...deck,
                clozes: updatedClozes,
                stats: { ...prevStats, lastStudied: now, totalReviews: (prevStats.totalReviews || 0) + 1 },
            });
        }
        let newQueue = dueQueue.slice(1);
        if (intervalMinutes < 10) {
            const insertPos = Math.min(newQueue.length, Math.floor(Math.random() * 3) + 1);
            newQueue.splice(insertPos, 0, { ...currentCard, nextReview, originalIndex: cardIndex });
        }
        setRevealed(false);
        setUserAnswers({});
        setDueQueue(newQueue);
        if (newQueue.length > 0) setCurrentCard(newQueue[0]); else setSessionComplete(true);
    }, [currentCard, cards, deck, dueQueue, onUpdateDeck]);

    const nextCard = useCallback(() => {
        setRevealed(false);
        setUserAnswers({});
        const nextIdx = (idx + 1) % cards.length;
        setIdx(nextIdx);
        setCurrentCard(cards[nextIdx]);
    }, [idx, cards]);

    const prevCard = useCallback(() => {
        setRevealed(false);
        setUserAnswers({});
        const prevIdx = (idx - 1 + cards.length) % cards.length;
        setIdx(prevIdx);
        setCurrentCard(cards[prevIdx]);
    }, [idx, cards]);

    if (sessionComplete) {
        if (isSRS) {
            const nextDue = cards.map(c => c.nextReview || 0).sort((a, b) => a - b)[0];
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-emerald-100 p-6 rounded-full mb-6 text-emerald-600"><CheckCircle size={48}/></div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Session Complete!</h2>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-6 flex items-center gap-3">
                        <Clock className="text-indigo-500"/>
                        <span className="text-sm font-medium text-slate-600">Next review: <strong>{nextDue ? new Date(nextDue).toLocaleTimeString() : 'Now'}</strong></span>
                    </div>
                    <button onClick={onBack} className="mt-12 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">Back to Dashboard</button>
                </div>
            );
        }
        return <div className="h-full flex items-center justify-center text-slate-400">No cards available.</div>;
    }

    if (!currentCard) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"/></div>;

    const status = getCardStatus(currentCard);
    const blanks = currentCard.blanks || [];
    const parts = currentCard.text.split('[BLANK]');

    return (
        <div className="h-full flex flex-col p-6 max-w-4xl mx-auto w-full">
            <button onClick={onBack} className="self-start mb-4 flex gap-2 text-slate-500 hover:text-indigo-600 font-medium"><ChevronLeft/> Back</button>
            <div className="flex-1 flex flex-col items-center justify-start py-6 overflow-y-auto">
                <div className="relative w-full max-w-2xl mb-6 flex items-center justify-center">
                    {!isSRS && <button onClick={prevCard} className="absolute left-0 p-3 bg-white rounded-full shadow hover:scale-110 transition z-10"><ChevronLeft/></button>}
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8 border relative">
                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>{status.label}</span>

                        <div className="text-lg font-medium leading-relaxed text-slate-800 mb-6 mt-2">
                            {parts.map((part, i) => {
                                const blank = blanks[i];
                                return (
                                    <span key={i}>
                                        {part}
                                        {blank && (revealed ? (
                                            (() => {
                                                const userAns = (userAnswers[i] || '').trim();
                                                const correct = userAns.toLowerCase() === blank.answer.trim().toLowerCase();
                                                return (
                                                    <span className={`inline-block px-2 py-0.5 rounded font-bold mx-1 ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                                                        {userAns || '—'}
                                                        {!correct && <span className="ml-2 text-emerald-700 font-normal text-sm">(✓ {blank.answer})</span>}
                                                    </span>
                                                );
                                            })()
                                        ) : (
                                            <span className="inline-block mx-1 align-middle">
                                                <input
                                                    type="text"
                                                    value={userAnswers[i] || ''}
                                                    onChange={e => setUserAnswers(a => ({ ...a, [i]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !revealed) setRevealed(true); }}
                                                    className="border-b-2 border-cyan-400 bg-cyan-50/30 px-2 py-0.5 text-center focus:outline-none focus:border-cyan-600 rounded-sm text-base"
                                                    style={{ minWidth: `${Math.max((blank.answer.length || 6) * 11, 60)}px` }}
                                                    placeholder="?"
                                                />
                                                {blank.hint && <span className="block text-xs text-slate-400 text-center mt-0.5">Hint: {blank.hint}</span>}
                                            </span>
                                        ))}
                                    </span>
                                );
                            })}
                        </div>

                        {!revealed && (
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setRevealed(true)}
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition"
                                >
                                    Check & Reveal
                                </button>
                            </div>
                        )}

                        {revealed && !isSRS && (
                            <div className="flex justify-center mt-4">
                                <button onClick={nextCard} className="px-8 py-3 bg-slate-800 text-white rounded-full font-bold shadow-lg hover:bg-slate-700 transition">Next Card</button>
                            </div>
                        )}
                    </div>
                    {!isSRS && <button onClick={nextCard} className="absolute right-0 p-3 bg-white rounded-full shadow hover:scale-110 transition z-10"><ChevronRight/></button>}
                </div>

                {isSRS && revealed && (
                    <div className="flex gap-3 animate-fade-in-up flex-wrap justify-center">
                        <button onClick={() => handleRate(1)} className="flex flex-col items-center px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition border-b-4 border-red-200 hover:border-red-300 active:border-b-0 active:translate-y-1"><span className="font-bold">Again</span><span className="text-[10px] opacity-70">1m</span></button>
                        <button onClick={() => handleRate(10)} className="flex flex-col items-center px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl transition border-b-4 border-orange-200 hover:border-orange-300 active:border-b-0 active:translate-y-1"><span className="font-bold">Hard</span><span className="text-[10px] opacity-70">10m</span></button>
                        <button onClick={() => handleRate(1440)} className="flex flex-col items-center px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition border-b-4 border-emerald-200 hover:border-emerald-300 active:border-b-0 active:translate-y-1"><span className="font-bold">Good</span><span className="text-[10px] opacity-70">1d</span></button>
                        <button onClick={() => handleRate(5760)} className="flex flex-col items-center px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition border-b-4 border-blue-200 hover:border-blue-300 active:border-b-0 active:translate-y-1"><span className="font-bold">Easy</span><span className="text-[10px] opacity-70">4d</span></button>
                    </div>
                )}

                <div className="mt-8 text-slate-400 font-medium text-sm">
                    {isSRS ? `Queue: ${dueQueue.length} remaining` : `Card ${idx + 1} / ${cards.length}`}
                </div>
            </div>
        </div>
    );
};

export default ClozeStudy;
