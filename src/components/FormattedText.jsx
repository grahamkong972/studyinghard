import { useRef, useEffect } from 'react';

const FormattedText = ({ text, className = "" }) => {
    const containerRef = useRef(null);

    const renderMath = () => {
        if (window.renderMathInElement && containerRef.current) {
            window.renderMathInElement(containerRef.current, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\(", right: "\\)", display: false},
                    {left: "\\[", right: "\\]", display: true}
                ],
                throwOnError: false
            });
        }
    };

    useEffect(() => {
        if (!window.renderMathInElement) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
            script.onload = () => {
                const autoRender = document.createElement('script');
                autoRender.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
                autoRender.onload = () => renderMath();
                document.head.appendChild(autoRender);
            };
            document.head.appendChild(script);
        } else {
            renderMath();
        }
    }, []);

    if (text === null || text === undefined) return null;

    const processText = (str) => {
        if (typeof str === 'object') return JSON.stringify(str);
        if (typeof str !== 'string') return String(str);
        return str
            .replace(/ewline/g, '<br/>')
            .replace(/\\newline/g, '<br/>')
            .replace(/\\\\n/g, '<br/>')
            .replace(/\\n/g, '<br/>')
            .replace(/\n/g, '<br/>')
            .replace(/\\textbf\{([^\}]+)\}/g, '<strong>$1</strong>')
            .replace(/\\text\{([^\}]+)\}/g, '$1')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/:\$/g, ':');
    };

    return (
        <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: processText(text) }} />
    );
};

export default FormattedText;
