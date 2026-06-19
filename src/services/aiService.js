import { cleanAndParseJSON } from '../utils/jsonParser';
import { sleep } from '../utils/dateUtils';

export const generateForDeck = async (prompt, systemInstruction, contextHistory, contextText = null) => {
    const PROXY_URL = `/api/generate-ai-content`;
    const systemPrompt = `
        You are KonDeck, an advanced AI tutor.
        ${systemInstruction || ''}
        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON.
        2. Do NOT use markdown code blocks.
        3. Double-escape all backslashes in LaTeX (e.g. \\\\alpha).
        4. Use HTML <br/> for line breaks.
        5. Use MARKDOWN for text formatting (e.g. **bold**).
        6. Use LaTeX ($...$) ONLY for mathematical formulas.
    `;

    const isFirstCall = !contextHistory;
    let messages;

    if (isFirstCall) {
        const contentBlocks = [];
        if (contextText) {
            contentBlocks.push({ type: 'text', text: `CONTEXT:\n${contextText}`, cache_control: { type: 'ephemeral' } });
        }
        contentBlocks.push({ type: 'text', text: `TASK:\n${prompt}` });
        messages = [{ role: 'user', content: contentBlocks }];
    } else {
        messages = [...contextHistory, { role: 'user', content: [{ type: 'text', text: `TASK:\n${prompt}` }] }];
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, system_instruction: { parts: [{ text: systemPrompt }] } })
            });
            if (response.status === 429) throw new Error("Quota Exceeded. Too many requests.");
            if (!response.ok) {
                const err = await response.json();
                throw new Error(`AI Error: ${err.error || response.statusText}${err.details ? ` — ${err.details}` : ''}`);
            }
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No content generated.");

            const result = cleanAndParseJSON(text);

            // After first call, store a slim 2-message history: [contextUser, ackAssistant]
            // This keeps history small — only the context blocks, not the large card JSON.
            let updatedHistory = contextHistory;
            if (isFirstCall) {
                const contextBlocks = messages[0].content.slice(0, -1); // drop TASK block
                if (contextBlocks.length > 0) {
                    updatedHistory = [
                        { role: 'user', content: contextBlocks },
                        { role: 'assistant', content: [{ type: 'text', text: 'Context received.' }] }
                    ];
                }
            }
            return { result, contextHistory: updatedHistory };
        } catch (error) {
            console.warn(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === 2) throw error;
            await sleep(2000 * (attempt + 1));
        }
    }
};

export const generateContent = async (prompt, context, systemInstruction, attachmentData = null, quantity = 1, contentType = 'flashcards') => {
    const PROXY_URL = `/api/generate-ai-content`;

    const contentConstraints = {
        flashcards: `FLASHCARD OUTPUT CONSTRAINTS (MANDATORY):
        - "q": Exactly 1 concept or 1 sentence. No compound questions. Max 20 words.
        - "a": Max 3 bullet points using • OR under 30 words total. NO paragraphs.`,
        mcq: `MCQ OUTPUT CONSTRAINTS (MANDATORY):
        - "q": Scenario- or application-based question. Max 30 words. No trivial recall.
        - "options": Exactly 4 options, each under 15 words, highly distinguishable.
        - "exp": Exactly 1-2 sentences — WHY correct answer is right and why top distractor is wrong.`,
        saq: `SAQ OUTPUT CONSTRAINTS (MANDATORY):
        - "q": Direct, specific question. Max 25 words.
        - "model": Structured model answer with 2-4 key points. Under 80 words total.
        - "marks": Integer between 2 and 7 reflecting complexity.`,
        exam: `EXAM MCQ OUTPUT CONSTRAINTS (MANDATORY):
        - "q": Hard, scenario-based question. Max 30 words.
        - "options": Exactly 4 options, each under 15 words, highly distinguishable.
        - "exp": Exactly 1-2 sentences — WHY correct answer is right and top distractor is wrong.`,
    };
    const fullSystemPrompt = `
        You are KonDeck, an advanced AI tutor. Be concise and precise.
        ${systemInstruction || ''}
        ${contentConstraints[contentType] || ''}
        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON.
        2. Do NOT use markdown code blocks.
        3. Double-escape all backslashes in LaTeX (e.g. \\\\alpha).
        4. Use HTML <br/> for line breaks.
        5. Use MARKDOWN for text formatting (e.g. **bold**).
        6. Use LaTeX ($...$) ONLY for mathematical formulas.
    `;
    const maxTokensByType = { flashcards: 800, mcq: 1200, saq: 1000, exam: 1200 };

    const contentsPart = [];
    if (context) contentsPart.push({ text: `CONTEXT:\n${context}` });
    if (attachmentData) {
        contentsPart.push(attachmentData);
        contentsPart.push({ text: "[DOCUMENT CONTEXT]: Analyze the attached image or PDF document carefully." });
    }
    contentsPart.push({ text: `TASK:\n${prompt}` });

    const requestBody = {
        contents: [{ parts: contentsPart }],
        system_instruction: { parts: [{ text: fullSystemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: maxTokensByType[contentType] || 1000
        }
    };

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.status === 429) {
                throw new Error("Quota Exceeded. Too many requests. Please wait a moment or check your Google Cloud billing.");
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`AI Request Proxy Error: ${errorData.error || response.statusText}${errorData.details ? ` — ${errorData.details}` : ''}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No content generated.");

            return cleanAndParseJSON(text);

        } catch (error) {
            console.warn(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === 2) throw error;
            await sleep(2000 * (attempt + 1));
        }
    }
};
