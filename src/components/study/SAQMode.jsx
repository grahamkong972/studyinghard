import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, CheckSquare, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { generateContent } from '../../services/aiService';
import FormattedText from '../FormattedText';

const SAQMode = ({ questions, onBack, userProfile }) => {
    const toast = useToast();
    const [idx, setIdx] = useState(0);
    const [userAnswer, setUserAnswer] = useState("");
    const [grading, setGrading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const question = questions[idx];

    const handleGrade = async () => {
        if (!userAnswer.trim()) return toast("Please type an answer first.");

        setGrading(true);
        const marks = question.marks || 5;
        try {
            const prompt = `You are a strict but fair university examiner grading a student's short answer response.

QUESTION: "${question.q}"
MARKS AVAILABLE: ${marks}
MODEL ANSWER: "${question.model}"
STUDENT ANSWER: "${userAnswer}"

GRADING RULES:
1. Award marks based on key points present in the student's answer compared to the model answer.
   Roughly 1 mark per correct key point, scaled to ${marks} marks total.
2. Do NOT penalise for different wording — reward correct understanding.
3. Do NOT award marks for vague or circular statements (e.g. "X is X because it is X").
4. Partial credit: if the student gets part of a multi-part concept right, award partial marks.
5. The "feedback" field must:
   - Start with what the student did well (if anything)
   - Clearly explain why marks were deducted
   - Be written as if speaking directly to the student
6. The "missing" field must list only the key concepts/points from the model answer that the student omitted or got wrong. Be specific — not "more detail needed" but "you did not mention X".
7. If the student scores full marks, set "missing" to "Nothing — full marks!".

Return ONLY valid JSON: { "score": number, "feedback": "...", "missing": "..." }`;
            const result = await generateContent(prompt, "", "");
            setFeedback(result);
        } catch (e) { toast(e.message); } finally { setGrading(false); }
    };

    const nextQuestion = () => { setFeedback(null); setUserAnswer(""); setIdx(prev => (prev + 1) % questions.length); };

    return (
        <div className="max-w-4xl mx-auto p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex gap-2 text-slate-500 hover:text-indigo-600 font-medium"><ChevronLeft/> Exit SAQ</button>
                <div className="text-sm font-bold text-slate-400">Question {idx + 1} of {questions.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Question</h3>
                    <div className="text-xl font-medium text-slate-800"><FormattedText text={`${question.q} (${question.marks || 5} marks)`}/></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <textarea
                        className="w-full h-40 p-4 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-sm leading-relaxed"
                        placeholder="Type your answer here..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        disabled={!!feedback}
                    ></textarea>
                    {!feedback && (
                        <div className="mt-4 flex justify-end">
                            <button onClick={handleGrade} disabled={grading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-70">
                                {grading ? <RotateCw className="animate-spin" size={18}/> : <CheckSquare size={18}/>} {grading ? "Grading..." : "Submit Answer"}
                            </button>
                        </div>
                    )}
                </div>
                {feedback && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-fade-in-up mb-20">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Sparkles className="text-indigo-500" size={20}/> AI Grading</h3>
                            <div className={`px-4 py-1 rounded-full text-sm font-bold ${feedback.score >= (question.marks || 5)*0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Score: {feedback.score}/{question.marks || 5}</div>
                        </div>
                        <div className="space-y-4">
                            <div><h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Feedback</h4><p className="text-sm text-slate-700 leading-relaxed"><FormattedText text={feedback.feedback}/></p></div>
                            {feedback.missing && <div className="bg-red-50 p-3 rounded-lg border border-red-100"><h4 className="text-xs font-bold text-red-500 uppercase mb-1">Missing Concepts</h4><p className="text-sm text-red-700"><FormattedText text={feedback.missing}/></p></div>}
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Model Answer</h4><p className="text-sm text-slate-600 italic"><FormattedText text={question.model}/></p></div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end"><button onClick={nextQuestion} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition flex items-center gap-2">Next Question <ChevronRight size={16}/></button></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SAQMode;
