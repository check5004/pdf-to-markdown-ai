
import React, { useEffect, useState, memo, useRef } from 'react';

// Because we can't use npm, we'll dynamically import from a CDN.
// We're adding support for GFM tables, math, raw HTML, and mermaid diagrams.
const loadMarkdownRenderer = async () => {
  const [ 
    { default: ReactMarkdown }, 
    { default: remarkGfm },
    { default: remarkMath },
    { default: rehypeKatex },
    { default: rehypeRaw }
  ] = await Promise.all([
    import('https://esm.sh/react-markdown@9?bundle'),
    import('https://esm.sh/remark-gfm@4?bundle'),
    import('https://esm.sh/remark-math@6?bundle'),
    import('https://esm.sh/rehype-katex@7?bundle'),
    import('https://esm.sh/rehype-raw@7?bundle'),
  ]);
  return { ReactMarkdown, remarkGfm, remarkMath, rehypeKatex, rehypeRaw };
};

// Declare mermaid global as it's loaded from a script tag
declare const mermaid: any;

interface MarkdownPreviewProps {
  markdown: string;
  isLoading: boolean;
  progressMessage: string;
}

// A component to render Mermaid diagrams
const Mermaid: React.FC<{ chart: string }> = memo(({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart && typeof mermaid !== 'undefined') {
      // For mermaid.run(), we place the chart text directly into the element.
      // Mermaid will process elements with the class 'mermaid' and replace the text with the SVG.
      ref.current.innerHTML = chart;
      ref.current.removeAttribute('data-processed'); // This attribute is added by mermaid, remove it for re-renders.

      try {
        // Use mermaid.run() to render the specific node.
        mermaid.run({
          nodes: [ref.current]
        });
      } catch (e: any) {
        console.error("Error rendering mermaid chart:", e);
        if (ref.current) {
            ref.current.innerHTML = `<div class="mermaid-error p-4 bg-red-100 text-red-700 border border-red-300 rounded-md"><p class="font-bold">Mermaid Diagram Error:</p><pre class="whitespace-pre-wrap"><code>${e.message || 'Invalid diagram syntax.'}</code></pre></div>`;
        }
      }
    }
  }, [chart]);

  // Add the 'mermaid' class for mermaid.run() to discover it.
  // Use a key to ensure React replaces the div if the chart content changes,
  // which helps in re-triggering the useEffect for rendering.
  return <div ref={ref} key={chart} className="mermaid-diagram-container flex justify-center my-4 mermaid" />;
});


const MemoizedMarkdownRenderer = memo(({ ReactMarkdown, remarkGfm, remarkMath, rehypeKatex, rehypeRaw, markdown }: any) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 border-b pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-5 mb-3 border-b pb-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 pl-4" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 pl-4" {...props} />,
              li: ({node, ...props}) => <li className="mb-2" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400 dark:border-gray-600 my-4" {...props} />,
              code: ({node, inline, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '')
                const lang = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');

                if (lang === 'mermaid' && !inline) {
                   return <Mermaid chart={codeString} />;
                }
                
                return !inline ? (
                  <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 overflow-x-auto my-4">
                    <code className={`language-${lang}`} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-sm font-mono" {...props}>
                    {children}
                  </code>
                )
              },
              table: ({node, ...props}) => <div className="overflow-x-auto"><table className="table-auto w-full my-4 border-collapse border border-gray-300 dark:border-gray-600" {...props} /></div>,
              thead: ({node, ...props}) => <thead className="bg-gray-100 dark:bg-gray-700" {...props} />,
              th: ({node, ...props}) => <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold" {...props} />,
              td: ({node, ...props}) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />,
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
});


const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, isLoading, progressMessage }) => {
  const [renderer, setRenderer] = useState<any>(null);

  useEffect(() => {
    loadMarkdownRenderer().then(setRenderer);
    if (typeof mermaid !== 'undefined') {
       const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
       mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: "inherit"
      });
    }
  }, []);

  if (isLoading) {
     return (
      <div className="w-full min-h-[200px] bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 flex justify-center items-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="animate-spin mx-auto h-8 w-8 text-primary-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>{progressMessage || 'AIがドキュメントを生成中です...'}</p>
          <p>これには時間がかかる場合があります。</p>
        </div>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="w-full min-h-[200px] bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 flex justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400">ここに解析結果が表示されます。</p>
      </div>
    );
  }

  return (
    <div className="prose dark:prose-invert max-w-none w-full min-h-[200px] bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 md:p-6 border dark:border-gray-700">
      {renderer ? (
         <MemoizedMarkdownRenderer 
            ReactMarkdown={renderer.ReactMarkdown} 
            remarkGfm={renderer.remarkGfm} 
            remarkMath={renderer.remarkMath}
            rehypeKatex={renderer.rehypeKatex}
            rehypeRaw={renderer.rehypeRaw}
            markdown={markdown}
          />
      ) : (
        <p>Markdownレンダラーを読み込み中...</p>
      )}
    </div>
  );
};

export default MarkdownPreview;
