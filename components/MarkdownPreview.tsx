
import React, { useEffect, useState, memo, useRef } from 'react';

// Dynamically import from a CDN for markdown rendering with extensions.
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

// Declare mermaid global as it's loaded from a script tag in index.html.
declare const mermaid: any;

interface MarkdownPreviewProps {
  markdown: string;
  isLoading: boolean;
  progressMessage: string;
}

// **FIX**: A more robust component to render Mermaid diagrams using direct DOM manipulation
// to avoid race conditions between React's state updates and Mermaid's async rendering.
const Mermaid: React.FC<{ chart: string }> = memo(({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [uniqueId] = useState(() => `mermaid-svg-${self.crypto.randomUUID()}`);

  useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      const container = containerRef.current;
      if (!container || !chart || typeof mermaid === 'undefined') {
        return;
      }
      
      // Set initial loading state directly on the DOM element.
      container.innerHTML = `<div class="p-4 text-gray-500 dark:text-gray-400">Rendering diagram...</div>`;
      
      try {
        // Use the promise-based render API, which is more reliable.
        const { svg } = await mermaid.render(uniqueId, chart);
        if (!isCancelled) {
          container.innerHTML = svg;
        }
      } catch (e: any) {
        if (!isCancelled) {
          console.error("Mermaid render error:", e);
          const errorMessage = e.message || 'Invalid diagram syntax';
          // Display a formatted error message directly in the container.
          container.innerHTML = `<div class="mermaid-error p-4 bg-red-100 text-red-700 border border-red-300 rounded-md"><p class="font-bold">Mermaid Diagram Error:</p><pre class="whitespace-pre-wrap text-left"><code>${errorMessage}</code></pre></div>`;
        }
      }
    };

    renderDiagram();
    
    return () => { isCancelled = true; };
  }, [chart, uniqueId]);

  // The component renders a single div, and the useEffect hook manages its content.
  return <div ref={containerRef} className="mermaid-diagram-container flex justify-center my-4" />;
});


// A memoized component for the core Markdown rendering logic.
const MemoizedMarkdownRenderer = memo(({ ReactMarkdown, remarkGfm, remarkMath, rehypeKatex, rehypeRaw, markdown, isMermaidReady }: any) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
              // Override 'code' to handle Mermaid diagrams conditionally.
              code: ({node, inline, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '');
                
                if (match && match[1] === 'mermaid' && !inline) {
                   if (isMermaidReady) {
                     return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                   } else {
                     return <div className="mermaid-diagram-container flex justify-center my-4 p-4 text-gray-500 dark:text-gray-400">Initializing Mermaid...</div>;
                   }
                }
                
                return <code className={className} {...props}>{children}</code>;
              },
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
});

// The main preview component.
const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, isLoading, progressMessage }) => {
  const [renderer, setRenderer] = useState<any>(null);
  const [isMermaidReady, setIsMermaidReady] = useState(false);
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    loadMarkdownRenderer().then(setRenderer);

    // This effect ensures Mermaid is initialized only once.
    if (typeof mermaid !== 'undefined' && !mermaidInitialized.current) {
       mermaidInitialized.current = true;
       const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
       
       try {
         mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: "inherit"
        });
        setIsMermaidReady(true);
       } catch (e) {
        console.error("Failed to initialize Mermaid:", e);
       }
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
            isMermaidReady={isMermaidReady}
          />
      ) : (
        <p>Markdownレンダラーを読み込み中...</p>
      )}
    </div>
  );
};

export default MarkdownPreview;
