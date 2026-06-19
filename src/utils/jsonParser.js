export const fixLiteralControlChars = (str) => {
    let out = '';
    let inString = false;
    let i = 0;
    while (i < str.length) {
        const ch = str[i];
        const code = str.charCodeAt(i);
        if (ch === '\\') {
            out += ch + (str[i + 1] || '');
            i += 2;
            continue;
        }
        if (ch === '"') inString = !inString;
        if (inString && code < 0x20) {
            if (ch === '\n') out += '\\n';
            else if (ch === '\r') out += '\\r';
            else if (ch === '\t') out += '\\t';
            else out += `\\u${code.toString(16).padStart(4, '0')}`;
        } else {
            out += ch;
        }
        i++;
    }
    return out;
};

export const fixJsonEscapes = (str) => {
    const VALID = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
    let out = '';
    let i = 0;
    while (i < str.length) {
        const ch = str[i];
        if (ch === '\\') {
            const next = str[i + 1];
            if (VALID.has(next)) {
                out += ch + next;
                i += 2;
            } else if (next === 'u') {
                const hex = str.substring(i + 2, i + 6);
                if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                    out += ch + next + hex;
                    i += 6;
                } else {
                    out += '\\\\';
                    i += 1;
                }
            } else {
                // Invalid escape — double the backslash
                out += '\\\\';
                i += 1;
            }
        } else {
            out += ch;
            i++;
        }
    }
    return out;
};

export const cleanAndParseJSON = (text) => {
    if (!text) return null;

    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);

    clean = fixLiteralControlChars(clean);
    clean = fixJsonEscapes(clean);

    // Attempt 1: full array parse
    try { return JSON.parse(clean); } catch (e1) {
        // Attempt 2: truncate to last complete object
        const lastClose = clean.lastIndexOf('}');
        if (lastClose !== -1 && clean.startsWith('[')) {
            try { return JSON.parse(clean.substring(0, lastClose + 1) + ']'); } catch { /* fall through */ }
        }

        // Attempt 3: extract each {...} individually — one bad card fails alone, rest are kept
        const recovered = [];
        let depth = 0, objStart = -1, inStr = false;
        for (let i = 0; i < clean.length; i++) {
            const ch = clean[i];
            if (ch === '\\') { i++; continue; }
            if (ch === '"') inStr = !inStr;
            if (!inStr) {
                if (ch === '{') { if (depth++ === 0) objStart = i; }
                else if (ch === '}' && --depth === 0 && objStart !== -1) {
                    try { recovered.push(JSON.parse(clean.substring(objStart, i + 1))); } catch { /* skip bad card */ }
                    objStart = -1;
                }
            }
        }
        if (recovered.length > 0) {
            console.warn(`cleanAndParseJSON: recovered ${recovered.length} objects via fallback`);
            return recovered;
        }

        console.error("JSON Parse Error:", e1);
        return null;
    }
};
