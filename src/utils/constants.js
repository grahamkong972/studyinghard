export const TYPE_KEY = { flashcards: 'cards', quiz: 'quiz', saq: 'saqs', exam: 'exams', cloze: 'clozes' };
export const TYPE_LABEL = { flashcards: 'flashcard', mcq: 'MCQ', saq: 'SAQ', cloze: 'cloze card' };
export const FORMAT_HINTS = {
    flashcards: `Q: What is X?\nA: X is...\n\nQ: What is Y?\nA: Y is...\n\nOr paste a JSON array:\n[{"q": "...", "a": "..."}]`,
    quiz: `Q: Which of the following is correct?\nA) Option one\nB) Option two\nC) Option three\nD) Option four\nANS: B\nEXP: Because...\n\nOr JSON: [{"q":"...","options":["...","...","...","..."],"a":1,"exp":"..."}]`,
    saq: `Q: Explain the concept of X.\nMODEL: X is important because...\nMARKS: 4\n\nOr JSON: [{"q":"...","model":"...","marks":4}]`,
};
