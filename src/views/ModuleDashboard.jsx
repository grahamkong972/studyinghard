import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Sparkles, Brain, PenTool, RotateCw, X, Hash, BookOpen, PieChart, Edit3, ClipboardPaste } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { generateForDeck, generateContent } from '../services/aiService';
import { buildExamMCQPrompt, buildExamSAQPrompt } from '../services/examPrompts';
import { validateAndFixData } from '../utils/cardUtils';
import { TYPE_KEY, TYPE_LABEL } from '../utils/constants';
import { formatRelativeDate, sleep } from '../utils/dateUtils';
import FormattedText from '../components/FormattedText';
import ManageModal from '../components/modals/ManageModal';
import PasteImportModal from '../components/modals/PasteImportModal';
import AnalysisModal from '../components/modals/AnalysisModal';
import ExamSetupModal from '../components/modals/ExamSetupModal';

const ModuleDashboard = ({ deck, onUpdateDeck, userProfile, onUpdateProfile }) => {
    const toast = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [genType, setGenType] = useState("flashcards");
    const [count, setCount] = useState(10);
    const saveTimer = useRef(null);
    const cancelRef = useRef(false);
    const [isAnalysing, setIsAnalysing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [pendingGenType, setPendingGenType] = useState(null);
    const [manageMode, setManageMode] = useState(null);
    const [showExamSetup, setShowExamSetup] = useState(false);
    const [pasteMode, setPasteMode] = useState(null); // null | 'flashcards' | 'quiz' | 'saq'

    const [inputs, setInputs] = useState({ notes: "" });

    const estimateCost = useCallback(() => {
        const textLength = inputs.notes?.length || 0;
        const baseCost = Math.ceil(textLength / 1000);
        const multiplier = genType === 'flashcards' ? 1 : 1.5;
        const finalCost = Math.ceil(baseCost + (count * multiplier));
        return finalCost;
    }, [inputs, count, genType]);

    useEffect(() => {
        const existing = deck.notes || deck.content || "";
        const merged = existing || [deck.transcript, deck.slides].filter(Boolean).join('\n\n');
        setInputs({ notes: merged });
    }, [deck.id]);

    const handleInputChange = (value) => {
        const newInputs = { notes: value };
        setInputs(newInputs);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onUpdateDeck({ ...deck, notes: value }), 800);
    };

    const handleDeleteItem = (index) => {
        const key = TYPE_KEY[manageMode] || 'cards';
        const prev = deck[key] || [];
        const newItems = prev.filter((_, i) => i !== index);
        onUpdateDeck({ ...deck, [key]: newItems });
        toast(`Deleted 1 item`, 'info', () => onUpdateDeck({ ...deck, [key]: prev }));
    };

    const handleDeleteAll = () => {
        const key = TYPE_KEY[manageMode] || 'cards';
        const prev = deck[key] || [];
        onUpdateDeck({ ...deck, [key]: [] });
        setManageMode(null);
        toast(`Deleted all ${manageMode}`, 'info', () => onUpdateDeck({ ...deck, [key]: prev }));
    };

    const handleUpdateItem = (index, updated) => {
        const key = TYPE_KEY[manageMode] || 'cards';
        const prev = deck[key] || [];
        const newItems = prev.map((item, i) => i === index ? { ...item, ...updated } : item);
        onUpdateDeck({ ...deck, [key]: newItems });
    };

    const handlePasteImport = (type, newCards) => {
        const key = TYPE_KEY[type] || 'cards';
        const existing = deck[key] || [];
        onUpdateDeck({ ...deck, [key]: [...existing, ...newCards] });
        toast(`Added ${newCards.length} ${type === 'flashcards' ? 'flashcard' : type === 'quiz' ? 'MCQ' : 'SAQ'}${newCards.length !== 1 ? 's' : ''}`, 'success');
    };

    const toggleStudyMode = (mode) => { onUpdateDeck({ ...deck, studyMode: mode }); };

    const handleClickGenerate = async (type) => {
        if (!inputs.notes.trim()) return toast("Please add notes before generating.");
        setIsAnalysing(true);
        setGenType(type);
        setPendingGenType(type);
        const fullContext = `MODULE: ${deck.title}\nNOTES: ${inputs.notes}`;
        const typeLabel = TYPE_LABEL[type] || type;
        const analysisPrompt = `Analyse the provided notes/content and return a JSON summary of what study material can be generated.
Return ONLY a valid JSON array containing one object (no prose, no markdown):
[{"topics":["..."],"thinAreas":["..."],"estimatedUnique":<integer>,"recommendation":"<one sentence about generating ${count} ${typeLabel}s>"}]
Rules:
- topics: up to 8 distinct concepts or subject areas found in the notes
- thinAreas: up to 4 areas that are mentioned too briefly to produce high-quality ${typeLabel}s
- estimatedUnique: realistic integer count of unique distinct ${typeLabel}s the notes can support
- recommendation: one sentence addressed to the student`;
        try {
            let systemInstruction = `Target audience: ${userProfile.age || 'University'} student`;
            if (userProfile.degree) systemInstruction += ` studying ${userProfile.degree}.`;
            const { result } = await generateForDeck(analysisPrompt, systemInstruction, null, fullContext);
            const parsed = Array.isArray(result) ? result[0] : result;
            setAnalysisResult(parsed || { topics: [], thinAreas: [], estimatedUnique: null, recommendation: '' });
        } catch (e) {
            // If analysis fails, fall through to direct generation
            setAnalysisResult(null);
            setPendingGenType(null);
            handleGenerate(type);
        } finally {
            setIsAnalysing(false);
        }
    };

    const handleGenerate = async (type, emphasizedTopics = []) => {
        const hasText = inputs.notes.trim();
        if (!hasText) return toast("Please add notes before generating.");

        cancelRef.current = false;
        setIsGenerating(true);
        setStatusMessage("Initializing...");
        const currentInputs = { ...inputs };

        try {
            const targetKey = TYPE_KEY[type] || 'quiz';

            // Build deduplication list from existing deck items (injected into prompt, not context)
            const existingItems = deck[targetKey] || [];
            const existingSummary = existingItems.length > 0
                ? `\n\nDO NOT REPEAT — ALREADY IN DECK:\n${existingItems.map(c => `- ${c.q || c.text}`).join('\n')}`
                : '';

            const fullContext = `MODULE: ${deck.title}\nNOTES: ${currentInputs.notes}`;
            const contextKey = fullContext.slice(0, 300);

            let systemInstruction = `Target audience: ${userProfile.age || 'University'} student`;
            if (userProfile.degree) systemInstruction += ` studying ${userProfile.degree}.`;
            systemInstruction += ` CRITICAL OUTPUT RULES: 1. Return ONLY valid JSON. 2. Do NOT use markdown code blocks. 3. Double-escape all backslashes in LaTeX (e.g. \\\\alpha). 4. Use HTML <br/> for line breaks inside strings. 5. NEVER include a literal double-quote character inside a string value — rewrite the phrase instead. 6. NEVER include literal newline characters inside a string value.`;

            // Restore stored history for this deck, or null if context has changed
            let currentContextHistory = (deck.convHistory && deck.convContextKey === contextKey)
                ? deck.convHistory
                : null;

            const BATCH_SIZE = (type === 'flashcards') ? 20 : 15;
            const totalBatches = Math.ceil(count / BATCH_SIZE);
            let accumulatedResults = [];

            for (let i = 0; i < totalBatches; i++) {
                if (cancelRef.current) break;
                setStatusMessage(`Generating batch ${i + 1} of ${totalBatches}...`);
                if (i > 0) await sleep(1000);

                const itemsRemaining = count - accumulatedResults.length;
                const currentBatchCount = Math.min(BATCH_SIZE, itemsRemaining);

                // Dedup: questions generated so far this session
                const sessionSummary = accumulatedResults.length > 0
                    ? `\n\nDO NOT REPEAT — ALREADY GENERATED THIS SESSION:\n${accumulatedResults.map(c => `- ${c.q || c.text}`).join('\n')}`
                    : '';

                // Both dedup lists go at the END of the prompt so the model sees them last
                const dedupBlock = existingSummary + sessionSummary;
                const emphasisBlock = emphasizedTopics.length > 0
                    ? `\n\nPRIORITIZE THESE TOPICS — generate proportionally more questions about them:\n${emphasizedTopics.map(t => `- ${t}`).join('\n')}`
                    : '';

                let prompt = "";

                if (type === "flashcards") {
                    prompt = `Generate exactly ${currentBatchCount} flashcards from the provided context.
${dedupBlock}${emphasisBlock}
STRICT RULES:
1. Every card must test a DIFFERENT concept. No rephrasing the same idea twice.
2. Vary the question TYPE across the deck using this distribution:
   - Definition cards: "What is X?" or "Define X"
   - Distinction cards: "What is the difference between X and Y?"
   - Application cards: "When would you use X over Y, and why?"
   - Consequence cards: "What happens if X property is violated?"
   - Complexity cards: "What is the time/space complexity of X and why?"
   - Example cards: "Give an example of X occurring in practice"
   - Process cards: "Walk through the steps of X"
   - Property cards: "What are the key properties of X?"
3. Answers must be COMPLETE and self-contained.
   Someone reading only the answer should fully understand the concept.
4. No one-word or one-line answers unless the concept genuinely requires it.
5. For complexity or technical topics, always explain WHY not just WHAT.
6. Prioritise concepts that are:
   - Commonly confused with similar concepts
   - Easy to memorise incorrectly
   - Foundational to understanding later topics
7. Do NOT generate cards that are trivially obvious or purely definitional
   if a deeper card on the same concept is possible.

Return ONLY valid JSON: [{"q": "...", "a": "..."}]`;
                } else if (type === "mcq") {
                    prompt = `Generate exactly ${currentBatchCount} multiple choice questions from the provided context.
${dedupBlock}${emphasisBlock}
STRICT RULES:
1. Every question must test a DIFFERENT concept. No rephrasing the same idea.
2. Vary the difficulty and question TYPE:
   - Recall questions: directly test factual knowledge
   - Application questions: present a scenario and ask what would happen
   - Comparison questions: ask which option is correct given two similar concepts
   - Misconception questions: include a plausible-sounding wrong answer that
     reflects a common student misunderstanding
   - Complexity questions: ask about time/space complexity with reasoning
   - "What if" questions: change one condition and ask how the outcome changes
3. DISTRACTOR RULES (wrong options):
   - All wrong options must be PLAUSIBLE. No obviously silly options.
   - Wrong options should reflect real misconceptions, not random guesses.
   - All options should be similar in length and style to avoid giveaways.
   - Never make the correct answer obviously longer or more detailed.
4. Explanations must state:
   - Why the correct answer is right
   - Why each wrong answer is wrong (briefly)
5. Questions should not be answerable by elimination alone.
6. Avoid trick questions or deliberately misleading wording.

Return ONLY valid JSON: [{
  "q": "...",
  "options": ["...", "...", "...", "..."],
  "a": 0,
  "exp": "..."
}]

Where "a" is the zero-based index of the correct option.`;
                } else if (type === "saq") {
                    prompt = `Generate exactly ${currentBatchCount} short answer questions from the provided context.
${dedupBlock}${emphasisBlock}
STRICT RULES:
1. Every question must test a DIFFERENT concept. No rephrasing the same idea.
2. Questions must require genuine understanding, not just recall.
   Bad: "What does LIFO stand for?"
   Good: "Explain why a Stack is described as LIFO, and give a real-world
          scenario where this property is essential."
3. Vary the question TYPE:
   - Explanation questions: "Explain why X behaves the way it does"
   - Comparison questions: "Compare X and Y, including when you would
     choose one over the other"
   - Analysis questions: "Given this scenario, identify the problem and
     suggest a solution using concepts from this module"
   - Justification questions: "Is X always better than Y? Justify your answer"
   - Design questions: "How would you implement X to achieve Y property?"
   - Trade-off questions: "What are the trade-offs of using X in this context?"
4. Mark allocation rules:
   - 2 marks: single focused concept, one clear explanation
   - 3-4 marks: requires comparison, two distinct points, or an example
   - 5-6 marks: requires multi-part explanation, justification, or analysis
   - 7 marks: requires synthesis of multiple concepts or a full design answer
5. Model answers must:
   - Directly address every part of the question
   - Be written at the level expected of a student, not a textbook
   - Include the key terms an examiner would look for
   - Be proportional to the mark value (roughly one key point per mark)
6. Do not write questions that can be answered in one sentence
   unless the mark value is 2.

Return ONLY valid JSON: [{
  "q": "...",
  "model": "...",
  "marks": 5
}]`;
                } else if (type === "cloze") {
                    prompt = `Generate exactly ${currentBatchCount} cloze (fill-in-the-blank) cards from the provided context.
${dedupBlock}${emphasisBlock}
STRICT RULES:
1. Put [BLANK] in "text" where a key term is removed. 1-3 blanks per card.
2. "blanks" array lists {"answer":"...","hint":"..."} in the ORDER [BLANK] appears.
3. Blank out KEY TERMS, definitions, mechanisms, or values — not filler words.
4. Enough context must remain in the sentence to recall the answer.
5. Every card tests a DIFFERENT concept. No repeats.
6. "hint": use "" if no hint needed. Only add a hint if the answer is genuinely subtle.

Return ONLY valid JSON: [{"text":"The [BLANK] is responsible for...","blanks":[{"answer":"mitochondria","hint":""}]}]`;
                }

                try {
                    const { result: batchResult, contextHistory: updatedHistory } = await generateForDeck(
                        prompt,
                        systemInstruction,
                        currentContextHistory,
                        currentContextHistory ? null : fullContext
                    );
                    currentContextHistory = updatedHistory;
                    const validatedResult = validateAndFixData(
                        Array.isArray(batchResult) ? batchResult : [batchResult],
                        type === 'exam' ? 'mcq' : type
                    );
                    accumulatedResults = [...accumulatedResults, ...validatedResult];
                } catch (batchError) {
                    console.error(batchError);
                    setStatusMessage(accumulatedResults.length > 0
                        ? `Batch ${i + 1} failed — saving ${accumulatedResults.length} item(s) generated so far.`
                        : `Generation failed: ${batchError.message}`
                    );
                    break;
                }
            }

            setStatusMessage("Saving...");
            const updatedDeck = { ...deck, ...currentInputs };
            updatedDeck[targetKey] = [...(deck[targetKey] || []), ...accumulatedResults];
            updatedDeck.convHistory = currentContextHistory;
            updatedDeck.convContextKey = contextKey;
            onUpdateDeck(updatedDeck);

        } catch (error) {
            toast(error.message);
        } finally {
            setIsGenerating(false);
            setStatusMessage("");
        }
    };

    // Live Exam Generation for Module
    const handleStartLiveExam = async ({ moduleIds, numMCQs, numSAQs, timeLimit }) => {
        setIsGenerating(true);
        setStatusMessage("Generating Exam Paper...");
        try {
             const currentInputs = { ...inputs };
             const combinedContext = `MODULE: ${deck.title}\nNOTES: ${currentInputs.notes}`;
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
             onUpdateDeck({ ...deck, exams: finalExam, examTimeLimit: timeLimit, mode: 'exam' });
             setShowExamSetup(false);
        } catch(e) { toast(e.message); } finally { setIsGenerating(false); setStatusMessage(""); }
    };
    if (isGenerating && statusMessage.includes("Exam")) { return (<div className="h-full flex flex-col items-center justify-center"><RotateCw className="animate-spin text-indigo-600 mb-4" size={48} /><h3 className="text-xl font-bold text-slate-800">Generating Exam Paper...</h3><p className="text-slate-500">Creating custom questions for {deck.title}</p></div>) }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6"><input value={deck.title} onChange={(e) => onUpdateDeck({...deck, title: e.target.value})} className="text-3xl font-bold bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none w-full pb-2 text-slate-800" placeholder="Module Title"/></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 h-[650px] flex flex-col overflow-hidden">
                    <div className="flex items-center px-4 py-3 border-b border-slate-200 bg-slate-50/50 gap-2">
                        <FileText size={15} className="text-slate-400"/>
                        <span className="text-sm font-medium text-slate-500">Notes</span>
                        {inputs.notes.length > 0 && <span className="ml-1 w-2 h-2 rounded-full bg-indigo-400"/>}
                    </div>
                    <div className="flex-1">
                        <textarea className="w-full h-full p-6 resize-none focus:outline-none focus:bg-slate-50/30 text-sm leading-relaxed font-mono text-slate-700" placeholder="Paste your notes, transcript, or any content here..." value={inputs.notes} onChange={(e) => handleInputChange(e.target.value)}></textarea>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 text-sm text-slate-600 items-center">
                            <button onClick={() => setPasteMode('flashcards')} className="p-2 rounded-lg border bg-white border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition flex items-center gap-2" title="Paste / Import your own cards"><ClipboardPaste size={18}/> Paste</button>
                            <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>
                            <div className="flex items-center gap-2"><span className="font-medium text-slate-500">Count:</span><div className="relative flex items-center"><Hash size={14} className="absolute left-2.5 text-slate-400 pointer-events-none"/><input type="number" min="1" max="50" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-20 pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 font-medium"/></div></div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => handleClickGenerate('flashcards')} disabled={isGenerating || isAnalysing} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm text-sm">{isAnalysing && genType==='flashcards' ? <RotateCw className="animate-spin" size={16}/> : isGenerating && genType==='flashcards' ? <RotateCw className="animate-spin" size={16}/> : <Sparkles size={16}/>} {isAnalysing && genType==='flashcards' ? 'Analysing...' : isGenerating && genType==='flashcards' ? statusMessage : 'Cards'}</button>
                            <button onClick={() => handleClickGenerate('mcq')} disabled={isGenerating || isAnalysing} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm text-sm">{isAnalysing && genType==='mcq' ? <RotateCw className="animate-spin" size={16}/> : isGenerating && genType==='mcq' ? <RotateCw className="animate-spin" size={16}/> : <Brain size={16}/>} {isAnalysing && genType==='mcq' ? 'Analysing...' : isGenerating && genType==='mcq' ? statusMessage : 'Quiz'}</button>
                            <button onClick={() => handleClickGenerate('saq')} disabled={isGenerating || isAnalysing} className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm text-sm">{isAnalysing && genType==='saq' ? <RotateCw className="animate-spin" size={16}/> : isGenerating && genType==='saq' ? <RotateCw className="animate-spin" size={16}/> : <PenTool size={16}/>} {isAnalysing && genType==='saq' ? 'Analysing...' : isGenerating && genType==='saq' ? statusMessage : 'SAQ'}</button>
                            <button onClick={() => handleClickGenerate('cloze')} disabled={isGenerating || isAnalysing} className="flex-1 sm:flex-none bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm text-sm">{isAnalysing && genType==='cloze' ? <RotateCw className="animate-spin" size={16}/> : isGenerating && genType==='cloze' ? <RotateCw className="animate-spin" size={16}/> : <FileText size={16}/>} {isAnalysing && genType==='cloze' ? 'Analysing...' : isGenerating && genType==='cloze' ? statusMessage : 'Cloze'}</button>
                            {isGenerating && <button onClick={() => { cancelRef.current = true; }} className="px-3 py-2 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 font-bold rounded-lg transition text-sm flex items-center gap-1" title="Cancel generation"><X size={16}/></button>}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                    {/* --- STATS PANEL --- */}
                    {(() => {
                        const now = Date.now();
                        const threeDays = 3 * 24 * 60 * 60 * 1000;
                        const cards = deck.cards || [];
                        const mastered = cards.filter(c => c.nextReview && c.nextReview > now + threeDays).length;
                        const due = cards.filter(c => !c.nextReview || c.nextReview <= now).length;
                        const learning = cards.length - mastered - due;
                        const stats = deck.stats || {};
                        const examHistory = stats.examHistory || [];
                        return (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><PieChart size={16}/> Study Stats</h3>
                            {/* Card breakdown */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 relative group">
                                    <button onClick={() => setManageMode('flashcards')} className="absolute top-1 right-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition" title="Manage"><Edit3 size={11}/></button>
                                    <div className="text-xl font-bold text-indigo-600">{cards.length}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total</div>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                                    <div className="text-xl font-bold text-emerald-600">{mastered}</div>
                                    <div className="text-[10px] text-emerald-400 font-bold uppercase">Mastered</div>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                                    <div className="text-xl font-bold text-amber-600">{due}</div>
                                    <div className="text-[10px] text-amber-400 font-bold uppercase">Due</div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            {cards.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                        <div className="bg-emerald-400 transition-all" style={{ width: `${(mastered / cards.length) * 100}%` }} title={`${mastered} mastered`} />
                                        <div className="bg-indigo-300 transition-all" style={{ width: `${(learning / cards.length) * 100}%` }} title={`${learning} learning`} />
                                        <div className="bg-amber-300 transition-all" style={{ width: `${(due / cards.length) * 100}%` }} title={`${due} due`} />
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Mastered</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-300 inline-block"/>Learning</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block"/>Due</span>
                                    </div>
                                </div>
                            )}
                            {/* Other counts */}
                            <div className="flex gap-2 text-center">
                                <div className="flex-1 bg-emerald-50 rounded-lg p-2 border border-emerald-100 relative group">
                                    <button onClick={() => setManageMode('quiz')} className="absolute top-1 right-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition" title="Manage"><Edit3 size={11}/></button>
                                    <div className="text-lg font-bold text-emerald-600">{deck.quiz?.length || 0}</div>
                                    <div className="text-[10px] text-emerald-400 font-bold uppercase">MCQs</div>
                                </div>
                                <div className="flex-1 bg-purple-50 rounded-lg p-2 border border-purple-100 relative group">
                                    <button onClick={() => setManageMode('saq')} className="absolute top-1 right-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition" title="Manage"><Edit3 size={11}/></button>
                                    <div className="text-lg font-bold text-purple-600">{deck.saqs?.length || 0}</div>
                                    <div className="text-[10px] text-purple-400 font-bold uppercase">SAQs</div>
                                </div>
                                <div className="flex-1 bg-cyan-50 rounded-lg p-2 border border-cyan-100 relative group">
                                    <button onClick={() => setManageMode('cloze')} className="absolute top-1 right-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition" title="Manage"><Edit3 size={11}/></button>
                                    <div className="text-lg font-bold text-cyan-600">{deck.clozes?.length || 0}</div>
                                    <div className="text-[10px] text-cyan-400 font-bold uppercase">Cloze</div>
                                </div>
                            </div>
                            {/* Last studied + total reviews */}
                            <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                                <span>Last studied: <span className="font-medium text-slate-600">{formatRelativeDate(stats.lastStudied)}</span></span>
                                <span>{stats.totalReviews || 0} reviews</span>
                            </div>
                            {/* Recent exam scores */}
                            {examHistory.length > 0 && (
                                <div className="pt-1 border-t border-slate-100">
                                    <div className="text-xs font-semibold text-slate-500 mb-2">Recent Exam Scores</div>
                                    <div className="space-y-1">
                                        {examHistory.slice(-5).reverse().map((e, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">{new Date(e.date).toLocaleDateString()} {e.practice ? '(practice)' : ''}</span>
                                                <span className={`font-bold ${e.maxScore > 0 && e.score / e.maxScore >= 0.7 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {e.maxScore > 0 ? `${e.score}/${e.maxScore}` : '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        );
                    })()}
                    <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                             <div className="flex justify-between items-center mb-3">
                                 <span className="font-bold text-slate-700">Study Mode</span>
                                 <div className="flex bg-slate-100 rounded-lg p-1">
                                     <button onClick={() => toggleStudyMode('standard')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${(!deck.studyMode || deck.studyMode === 'standard') ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Standard</button>
                                     <button onClick={() => toggleStudyMode('srs')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${deck.studyMode === 'srs' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Smart</button>
                                 </div>
                             </div>
                             <button onClick={() => onUpdateDeck({...deck, mode: 'flashcards'})} disabled={!deck.cards?.length} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                 <BookOpen size={18}/> Study Flashcards
                             </button>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                            <button onClick={() => onUpdateDeck({...deck, mode: 'quiz', quizMode: 'practice'})} disabled={!deck.quiz?.length} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"><Brain size={18}/> Practice Quiz</button>
                            <button onClick={() => onUpdateDeck({...deck, mode: 'saq'})} disabled={!deck.saqs?.length} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"><PenTool size={18}/> Practice SAQs</button>
                            <button onClick={() => onUpdateDeck({...deck, mode: 'cloze'})} disabled={!deck.clozes?.length} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"><FileText size={18}/> Practice Cloze</button>
                        </div>
                    </div>
                </div>
            </div>
            {manageMode && <ManageModal type={manageMode} items={deck[TYPE_KEY[manageMode] || 'cards'] || []} onClose={() => setManageMode(null)} onDeleteItem={handleDeleteItem} onDeleteAll={handleDeleteAll} onUpdateItem={handleUpdateItem} />}
            {pasteMode && <PasteImportModal initialType={pasteMode} onClose={() => setPasteMode(null)} onImport={handlePasteImport} />}
            {analysisResult && <AnalysisModal analysis={analysisResult} type={pendingGenType} count={count} onConfirm={({ finalCount, emphasizedTopics }) => { setCount(finalCount); setAnalysisResult(null); handleGenerate(pendingGenType, emphasizedTopics); }} onClose={() => { setAnalysisResult(null); setPendingGenType(null); }} />}
        </div>
    );
};

export default ModuleDashboard;
