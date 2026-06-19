export const buildExamMCQPrompt = (count) => `Generate exactly ${count} multiple choice questions for a FINAL EXAM from the provided context.

STRICT RULES:
1. Every question must test a DIFFERENT concept. No rephrasing the same idea.
2. Questions must be HARD — suitable for a final exam. Prioritise application, analysis, and scenario-based questions over pure recall.
3. Vary the question TYPE:
   - Scenario questions: describe a situation and ask what happens or what should be done
   - Comparison questions: ask which option is correct given two similar concepts
   - Misconception questions: include a plausible wrong answer that reflects a common misunderstanding
   - Complexity questions: ask about time/space complexity with reasoning
   - "What if" questions: change one condition and ask how the outcome changes
4. DISTRACTOR RULES (wrong options):
   - All wrong options must be PLAUSIBLE — no obviously silly distractors
   - Wrong options should reflect real misconceptions students commonly hold
   - All options should be similar in length and style
   - Never make the correct answer obviously longer or more detailed
5. Explanations must state why the correct answer is right AND why each wrong answer is wrong (briefly).
6. Questions should not be answerable by elimination alone.

Return ONLY valid JSON: [{"q": "...", "options": ["...", "...", "...", "..."], "a": 0, "exp": "..."}]
Where "a" is the zero-based index of the correct option.`;

export const buildExamSAQPrompt = (count) => `Generate exactly ${count} short answer questions for a FINAL EXAM from the provided context.

STRICT RULES:
1. Every question must test a DIFFERENT concept. No rephrasing the same idea.
2. Questions must require genuine understanding — suitable for a final exam. No pure recall.
   Bad: "What does LIFO stand for?"
   Good: "Explain why a Stack is described as LIFO, and give a real-world scenario where this property is essential."
3. Vary the question TYPE:
   - Explanation: "Explain why X behaves the way it does"
   - Comparison: "Compare X and Y, including when you would choose one over the other"
   - Analysis: "Given this scenario, identify the problem and suggest a solution"
   - Justification: "Is X always better than Y? Justify your answer"
   - Design: "How would you implement X to achieve Y property?"
   - Trade-off: "What are the trade-offs of using X in this context?"
4. Mark allocation rules:
   - 2 marks: single focused concept, one clear explanation
   - 3-4 marks: comparison, two distinct points, or an example required
   - 5-6 marks: multi-part explanation, justification, or analysis required
   - 7 marks: synthesis of multiple concepts or a full design answer required
5. Model answers must directly address every part of the question, include key terms an examiner would look for, and be proportional to the mark value (roughly one key point per mark).

Return ONLY valid JSON: [{"q": "...", "model": "...", "marks": 5}]`;
