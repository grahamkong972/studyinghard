import { useState, useMemo } from 'react';
import { Folder, Layers, FileQuestion, Timer, RotateCw, Check, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { generateContent } from '../services/aiService';
import { buildExamMCQPrompt, buildExamSAQPrompt } from '../services/examPrompts';
import { validateAndFixData } from '../utils/cardUtils';
import FlashcardStudy from '../components/study/FlashcardStudy';
import ExamRunner from '../components/study/ExamRunner';
import ExamSetupModal from '../components/modals/ExamSetupModal';

const FolderDashboard = ({ folder, decks, onUpdateFolder, onUpdateDeck, userProfile }) => {
    const toast = useToast();
    const [isGlobalStudy, setIsGlobalStudy] = useState(false);
    const [globalStudyMode, setGlobalStudyMode] = useState('srs');
    const [globalShuffle, setGlobalShuffle] = useState(true);
    const [showExamSetup, setShowExamSetup] = useState(false);
    const [activeExamData, setActiveExamData] = useState(null);
    const [examTimeLimit, setExamTimeLimit] = useState(0);
    const [isExamGenerating, setIsExamGenerating] = useState(false);

    const globalCards = useMemo(() => decks.flatMap(d => (d.cards || []).map(c => ({...c, _deckId: d.id}))), [decks]);

    const handleGlobalUpdate = (updatedGlobalDeck) => {
        const cardsByDeck = {};
        updatedGlobalDeck.cards.forEach(c => {
            if (c._deckId) { if (!cardsByDeck[c._deckId]) cardsByDeck[c._deckId] = []; cardsByDeck[c._deckId].push(c); }
        });
        Object.keys(cardsByDeck).forEach(deckId => {
            const originalDeck = decks.find(d => d.id === parseInt(deckId) || d.id === deckId);
            if (originalDeck) { onUpdateDeck({ ...originalDeck, cards: cardsByDeck[deckId] }); }
        });
    };

    const handleStartLiveExam = async ({ moduleIds, numMCQs, numSAQs, timeLimit }) => {
        setIsExamGenerating(true);
        try {
            const selectedDecks = decks.filter(d => moduleIds.includes(d.id));
            const combinedContext = selectedDecks.map(d => `MODULE: ${d.title}\n${d.notes || ''}`).join("\n\n---\n\n");

            let mcqs = [];
            if(numMCQs > 0) {
                 const rawMCQ = await generateContent(buildExamMCQPrompt(numMCQs), combinedContext, "", null, numMCQs, "exam");
                 mcqs = validateAndFixData(Array.isArray(rawMCQ) ? rawMCQ : [rawMCQ], 'mcq');
            }

            let saqs = [];
            if(numSAQs > 0) {
                 const rawSAQ = await generateContent(buildExamSAQPrompt(numSAQs), combinedContext, "", null, numSAQs, "saq");
                 saqs = validateAndFixData(Array.isArray(rawSAQ) ? rawSAQ : [rawSAQ], 'saq');
            }

            const finalExam = [...mcqs, ...saqs];
            if (finalExam.length === 0) throw new Error("Failed to generate exam questions.");

            setExamTimeLimit(timeLimit);
            setActiveExamData(finalExam);
            setShowExamSetup(false);
        } catch (e) {
            toast(e.message);
        } finally {
            setIsExamGenerating(false);
        }
    };

    if (isGlobalStudy) {
        let finalCards = globalCards;
        if (globalShuffle) {
            finalCards = [...globalCards].sort(() => Math.random() - 0.5);
        }
        const virtualDeck = { id: 'global', title: `${folder.name} (Global)`, studyMode: globalStudyMode, cards: finalCards };
        return <FlashcardStudy cards={finalCards} deck={virtualDeck} onUpdateDeck={handleGlobalUpdate} onBack={() => setIsGlobalStudy(false)} />;
    }

    if (activeExamData) {
         return <ExamRunner questions={activeExamData} timeLimit={examTimeLimit} onBack={() => setActiveExamData(null)} userProfile={userProfile} />;
    }

    if (isExamGenerating) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <RotateCw className="animate-spin text-indigo-600 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-800">Generating Live Exam...</h3>
                <p className="text-slate-500"> analyzing {decks.length} modules to build your paper.</p>
            </div>
        )
    }

    const totalCards = decks.reduce((sum, d) => sum + (d.cards?.length || 0), 0);
    const totalQuestions = decks.reduce((sum, d) => sum + (d.quiz?.length || 0), 0);
    const totalSaqs = decks.reduce((sum, d) => sum + (d.saqs?.length || 0), 0);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Folder size={32} className="text-indigo-500"/> {folder.name} <span className="text-slate-400 text-lg font-normal">/ Course Overview</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-xl shadow-md text-white">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Layers/> Global Flashcards</h3>
                    <div className="flex items-center gap-3 mb-4 bg-white/10 p-1 rounded-lg">
                        <button onClick={() => setGlobalStudyMode('standard')} className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition ${globalStudyMode === 'standard' ? 'bg-white text-indigo-600 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Standard</button>
                        <button onClick={() => setGlobalStudyMode('srs')} className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition ${globalStudyMode === 'srs' ? 'bg-white text-indigo-600 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Smart (SRS)</button>
                    </div>
                    <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setGlobalShuffle(!globalShuffle)}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${globalShuffle ? 'bg-white border-white text-indigo-600' : 'border-indigo-200 text-transparent'}`}><Check size={14} strokeWidth={4} /></div>
                        <span className="text-sm font-medium text-indigo-50">Shuffle Cards</span>
                    </div>
                    <button onClick={() => setIsGlobalStudy(true)} disabled={totalCards === 0} className="w-full bg-white text-indigo-600 font-bold py-3 rounded-lg hover:bg-indigo-50 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Zap size={18}/> Start Studying ({totalCards} cards)</button>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-xl shadow-md text-white">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><FileQuestion/> Mock Exam</h3>
                    <p className="text-red-100 text-sm mb-4">Generate a fresh exam paper from your modules.</p>
                    <button onClick={() => setShowExamSetup(true)} disabled={decks.length === 0} className="w-full bg-white text-red-600 font-bold py-3 rounded-lg hover:bg-red-50 transition disabled:opacity-70 flex items-center justify-center gap-2"><Timer size={18}/> Build Exam</button>
                </div>
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-4">Course Totals</h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-slate-800">{decks.length}</div><div className="text-xs text-slate-500 uppercase">Modules</div></div>
                        <div className="bg-indigo-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-indigo-600">{totalCards}</div><div className="text-xs text-indigo-400 uppercase">Cards</div></div>
                        <div className="bg-emerald-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-emerald-600">{totalQuestions}</div><div className="text-xs text-emerald-400 uppercase">MCQs</div></div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-purple-600">{totalSaqs}</div><div className="text-xs text-purple-400 uppercase">SAQs</div></div>
                    </div>
                </div>
            </div>
            {showExamSetup && <ExamSetupModal modules={decks} onClose={() => setShowExamSetup(false)} onStartExam={handleStartLiveExam} />}
        </div>
    );
};

export default FolderDashboard;
