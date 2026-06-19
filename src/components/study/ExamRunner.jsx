import { useState, useEffect } from 'react';
import { ChevronLeft, Clock, RotateCw, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { generateContent } from '../../services/aiService';
import FormattedText from '../FormattedText';

const ExamRunner = ({ questions, timeLimit, onBack, userProfile, practice = false, onRecordResult }) => {
    const toast = useToast();
    const [answers, setAnswers] = useState({});
    const [saqFeedback, setSaqFeedback] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : 600);
    const [gradingLoading, setGradingLoading] = useState({});

    useEffect(() => {
        if (practice) return;
        if (!submitted && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !submitted) {
            setSubmitted(true);
        }
    }, [submitted, timeLeft, practice]);

    // Record result once when exam is submitted
    useEffect(() => {
        if (!submitted || !onRecordResult) return;
        const mcqQs = questions.filter(q => q.type !== 'saq');
        const score = mcqQs.reduce((acc, q) => answers[questions.indexOf(q)] === q.a ? acc + 1 : acc, 0);
        onRecordResult({ date: Date.now(), score, maxScore: mcqQs.length, practice });
    }, [submitted]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const mcqQuestions = questions.filter(q => q.type !== 'saq');
    const mcqCount = mcqQuestions.length;
    const mcqScore = mcqQuestions.reduce((acc, q) => {
        const idx = questions.indexOf(q);
        if (answers[idx] === q.a) return acc + 1;
        return acc;
    }, 0);

    const gradeSAQ = async (index, userProfile) => {
        setGradingLoading(prev => ({ ...prev, [index]: true }));
        try {
            const q = questions[index];
            const userAns = answers[index] || "No answer provided.";
            const marks = q.marks || 5;
            const prompt = `Grade this SAQ out of ${marks}. Question: "${q.q}". Model: "${q.model}". Student: "${userAns}". Return JSON: { "score": number, "feedback": "string", "missing": "string" }`;
            const result = await generateContent(prompt, "", "");
            setSaqFeedback(prev => ({ ...prev, [index]: result }));
        } catch (e) { toast(e.message); }
        finally { setGradingLoading(prev => ({ ...prev, [index]: false })); }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#f8fafc] py-4 z-10 border-b">
                <button onClick={onBack} className="flex gap-2 text-slate-500 hover:text-indigo-600 font-medium"><ChevronLeft/> Exit</button>
                {!submitted ? (
                    !practice && <div className={`font-mono font-bold text-xl flex items-center gap-2 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                        <Clock size={20}/> {formatTime(timeLeft)}
                    </div>
                ) : (
                    <div className="font-bold text-xl text-slate-800">{practice ? 'Quiz Finished' : 'Exam Finished'}</div>
                )}
            </div>

            {submitted && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">MCQ Results</h2>
                        <p className="text-slate-500">You scored {mcqScore} / {mcqCount} on multiple choice.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase">SAQ Review</div>
                        <p className="text-slate-500 text-sm">Scroll down to self-mark or AI-grade your written answers.</p>
                    </div>
                </div>
            )}

            <div className="space-y-8 pb-20">
                {questions.map((q, idx) => {
                    const isSAQ = q.type === 'saq';
                    return (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex gap-3 mb-4">
                                <span className="font-bold text-slate-400">{idx + 1}.</span>
                                <div className="flex-1">
                                    <div className="font-medium text-lg text-slate-800">
                                        <FormattedText text={`${q.q} ${isSAQ ? `(${q.marks || 5} marks)` : ''}`}/>
                                    </div>
                                    {isSAQ && <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">Short Answer</span>}
                                </div>
                            </div>
                            {isSAQ ? (
                                <div className="pl-6">
                                    <textarea
                                        className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Type your answer..."
                                        value={answers[idx] || ""}
                                        onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                                        disabled={submitted}
                                    />
                                    {submitted && (
                                        <div className="mt-4 space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Model Answer</div>
                                                <div className="text-sm text-slate-700"><FormattedText text={q.model}/></div>
                                            </div>
                                            {!saqFeedback[idx] ? (
                                                <button onClick={() => gradeSAQ(idx, userProfile)} disabled={gradingLoading[idx]} className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                                    {gradingLoading[idx] ? <RotateCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} Grade with AI
                                                </button>
                                            ) : (
                                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-purple-800">AI Feedback</span>
                                                        <span className="bg-white px-2 py-1 rounded text-xs font-bold text-purple-600 border border-purple-200">Score: {saqFeedback[idx].score}/{q.marks || 5}</span>
                                                    </div>
                                                    <div className="text-sm text-purple-900 mb-2"><FormattedText text={saqFeedback[idx].feedback}/></div>
                                                    {saqFeedback[idx].missing && <div className="text-xs text-red-600 mt-2 pt-2 border-t border-purple-100"><strong>Missing:</strong> <FormattedText text={saqFeedback[idx].missing}/></div>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="pl-6 space-y-2">
                                    {q.options.map((opt, oIdx) => {
                                        const isSelected = answers[idx] === oIdx;
                                        let btnClass = "w-full text-left p-3 rounded-lg border transition flex gap-3 ";
                                        if (submitted) {
                                            if (oIdx === q.a) btnClass += "bg-emerald-100 border-emerald-300 font-bold text-emerald-800";
                                            else if (isSelected) btnClass += "bg-red-100 border-red-300 text-red-800";
                                            else btnClass += "opacity-50";
                                        } else {
                                            btnClass += isSelected ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400" : "hover:bg-slate-50";
                                        }
                                        return (
                                            <button key={oIdx} onClick={() => !submitted && setAnswers({...answers, [idx]: oIdx})} className={btnClass}>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-current' : 'border-slate-300'}`}>{isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}</div>
                                                <FormattedText text={opt}/>
                                            </button>
                                        )
                                    })}
                                    {submitted && <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600"><strong>Explanation:</strong> <FormattedText text={q.exp}/></div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {!submitted && <div className="sticky bottom-6 flex justify-center"><button onClick={() => setSubmitted(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-xl transition hover:-translate-y-1">Submit Exam</button></div>}
        </div>
    );
};

export default ExamRunner;
