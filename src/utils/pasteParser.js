export const parsePastedCards = (text, type) => {
    const trimmed = text.trim();

    // JSON path — detect array or object
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed.startsWith('{') ? `[${trimmed}]` : trimmed);
            if (!Array.isArray(parsed)) throw new Error("Expected a JSON array.");
            if (type === 'flashcards') {
                return parsed.map((c, i) => {
                    if (!c.q || !c.a) throw new Error(`Item ${i + 1}: missing "q" or "a".`);
                    return { q: String(c.q).trim(), a: String(c.a).trim(), id: `paste-${Date.now()}-${i}` };
                });
            }
            if (type === 'quiz') {
                return parsed.map((c, i) => {
                    if (!c.q || !Array.isArray(c.options) || c.a == null) throw new Error(`Item ${i + 1}: missing "q", "options", or "a".`);
                    return { type: 'mcq', q: String(c.q).trim(), options: c.options.map(String), a: Number(c.a), exp: c.exp ? String(c.exp).trim() : '' };
                });
            }
            if (type === 'saq') {
                return parsed.map((c, i) => {
                    if (!c.q || !c.model) throw new Error(`Item ${i + 1}: missing "q" or "model".`);
                    return { type: 'saq', q: String(c.q).trim(), model: String(c.model).trim(), marks: Number(c.marks) || 4 };
                });
            }
        } catch (e) {
            throw new Error("JSON parse error: " + e.message);
        }
    }

    // Plain-text path — split blocks on blank lines
    const blocks = trimmed.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    if (blocks.length === 0) throw new Error("No cards found. Check the format.");

    if (type === 'flashcards') {
        return blocks.map((block, i) => {
            const qMatch = block.match(/^Q:\s*(.+)/im);
            const aMatch = block.match(/^A:\s*([\s\S]+)/im);
            if (!qMatch || !aMatch) throw new Error(`Block ${i + 1}: expected "Q:" and "A:" lines.`);
            return { q: qMatch[1].trim(), a: aMatch[1].trim(), id: `paste-${Date.now()}-${i}` };
        });
    }

    if (type === 'quiz') {
        return blocks.map((block, i) => {
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            const qLine = lines.find(l => /^Q:/i.test(l));
            const optA = lines.find(l => /^A[\)\.]/i.test(l));
            const optB = lines.find(l => /^B[\)\.]/i.test(l));
            const optC = lines.find(l => /^C[\)\.]/i.test(l));
            const optD = lines.find(l => /^D[\)\.]/i.test(l));
            const ansLine = lines.find(l => /^ANS:/i.test(l));
            const expLine = lines.find(l => /^EXP:/i.test(l));
            if (!qLine || !optA || !optB || !ansLine) throw new Error(`Block ${i + 1}: expected Q:, A), B), and ANS: lines.`);
            const q = qLine.replace(/^Q:\s*/i, '').trim();
            const options = [optA, optB, optC, optD].filter(Boolean).map(l => l.replace(/^[A-D][\)\.]\s*/i, '').trim());
            const ansLetter = ansLine.replace(/^ANS:\s*/i, '').trim().toUpperCase();
            const ansIndex = ['A','B','C','D'].indexOf(ansLetter);
            if (ansIndex === -1) throw new Error(`Block ${i + 1}: ANS must be A, B, C, or D.`);
            return { type: 'mcq', q, options, a: ansIndex, exp: expLine ? expLine.replace(/^EXP:\s*/i, '').trim() : '' };
        });
    }

    if (type === 'saq') {
        return blocks.map((block, i) => {
            const qMatch = block.match(/^Q:\s*(.+)/im);
            const modelMatch = block.match(/^MODEL:\s*([\s\S]+?)(?=\nMARKS:|$)/im);
            const marksMatch = block.match(/^MARKS:\s*(\d+)/im);
            if (!qMatch || !modelMatch) throw new Error(`Block ${i + 1}: expected "Q:" and "MODEL:" lines.`);
            return { type: 'saq', q: qMatch[1].trim(), model: modelMatch[1].trim(), marks: marksMatch ? Number(marksMatch[1]) : 4 };
        });
    }

    throw new Error("Unknown type.");
};
