import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  DocumentIcon,
} from './Icons';

// pdf.js is loaded from a CDN, so we declare its global object.
declare const pdfjsLib: any;

interface PdfPreviewProps {
  files: File[];
}

// NEW: Unique key for each file to ensure cache correctness
const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

interface PdfInfo {
  doc: any;
  numPages: number;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ files }) => {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  const [pdfCache, setPdfCache] = useState<Record<string, PdfInfo>>({});
  const [pageCache, setPageCache] = useState<Record<string, number>>({});
  const [scaleCache, setScaleCache] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const activeRenderTask = useRef<any>(null); // To hold the pdf.js render task
  
  // Effect to clean up caches when files are added or removed
  useEffect(() => {
    if (files.length === 0) {
      setPdfCache({});
      setPageCache({});
      setScaleCache({});
      return;
    }
    const activeFileKeys = new Set(files.map(getFileKey));
    
    const cleanup = <T extends unknown>(
        setCache: React.Dispatch<React.SetStateAction<Record<string, T>>>
    ) => {
        setCache(prevCache => {
            const newCache = { ...prevCache };
            let hasChanged = false;
            for (const key of Object.keys(newCache)) {
                if (!activeFileKeys.has(key)) {
                    delete newCache[key];
                    hasChanged = true;
                }
            }
            return hasChanged ? newCache : prevCache;
        });
    };

    cleanup(setPdfCache);
    cleanup(setPageCache);
    cleanup(setScaleCache);
  }, [files]);


  const currentFile = files[currentFileIndex];
  const currentFileKey = currentFile ? getFileKey(currentFile) : null;
  const currentPdfInfo = currentFileKey ? pdfCache[currentFileKey] : undefined;
  const currentPage = currentFileKey ? (pageCache[currentFileKey] || 1) : 1;
  const currentScale = currentFileKey ? (scaleCache[currentFileKey] || 0) : 0; // Default to 0 until calculated
  const numPages = currentPdfInfo?.numPages || 0;

  // Unified effect to load PDF, calculate initial scale, and render the page.
  useEffect(() => {
    if (!currentFileKey || !canvasRef.current || !previewContainerRef.current) {
      return;
    }
    
    const activeTab = tabsContainerRef.current?.querySelector(`[data-index="${currentFileIndex}"]`);
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    
    let isCancelled = false;
    
    const loadAndRender = async () => {
      setIsLoading(true);
      try {
        // Step 1: Load PDF from cache or file
        let pdfInfo = pdfCache[currentFileKey];
        if (!pdfInfo) {
          const file = files[currentFileIndex];
          if (!file) {
             setIsLoading(false);
             return;
          }
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pdfInfo = { doc: pdf, numPages: pdf.numPages };
          if (isCancelled) return;
          // This state update will cause a re-run, so we return to let the next run handle rendering.
          setPdfCache(prev => ({ ...prev, [currentFileKey]: pdfInfo! }));
          return;
        }

        // Step 2: Set initial scale if not already cached
        let scaleToRender = scaleCache[currentFileKey];
        if (!scaleToRender) {
          // FIX: Set initial zoom level to a fixed 50% as requested.
          scaleToRender = 0.5;
          if (isCancelled) return;
          // This state update will cause a re-run, so we return.
          setScaleCache(prev => ({...prev, [currentFileKey]: scaleToRender! }));
          return;
        }

        // Step 3: Render the current page with the determined scale
        const page = await pdfInfo.doc.getPage(currentPage);
        if (isCancelled) return;
        
        const viewport = page.getViewport({ scale: scaleToRender });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // FIX: Cancel any previous render task before starting a new one to prevent race conditions.
        if (activeRenderTask.current) {
          activeRenderTask.current.cancel();
        }

        const renderTask = page.render({ canvasContext: context, viewport });
        activeRenderTask.current = renderTask;
        
        await renderTask.promise;
        
        if (!isCancelled) {
            activeRenderTask.current = null;
        }

      } catch (error: any) {
        if (!isCancelled) {
            // pdf.js throws a "Rendering cancelled" error when we call .cancel(), which is expected.
            // We should not log this as an error.
            if (error.name !== 'RenderingCancelledException') {
                 console.error("Error in loadAndRender:", error);
            }
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadAndRender();

    return () => { 
        isCancelled = true;
        // FIX: When the component unmounts or dependencies change, cancel the active render task.
        if (activeRenderTask.current) {
            activeRenderTask.current.cancel();
            activeRenderTask.current = null;
        }
    };
  }, [files, currentFileIndex, currentPage, pdfCache, scaleCache]); // Effect re-runs when key parameters change
  
  
  const handleGoToPrevPage = useCallback(() => {
    if (!currentFileKey) return;
    setPageCache(prev => ({ ...prev, [currentFileKey]: Math.max(1, (prev[currentFileKey] || 1) - 1) }));
  }, [currentFileKey]);

  const handleGoToNextPage = useCallback(() => {
    if (!currentFileKey) return;
    const numPages = pdfCache[currentFileKey]?.numPages || 0;
    if (numPages === 0) return;
    setPageCache(prev => ({ ...prev, [currentFileKey]: Math.min(numPages, (prev[currentFileKey] || 1) + 1) }));
  }, [currentFileKey, pdfCache]);
  
  const handleZoomIn = useCallback(() => {
    if (!currentFileKey) return;
    setScaleCache(prev => ({ ...prev, [currentFileKey]: Math.min(3, (prev[currentFileKey] || 1.0) + 0.2) }));
  }, [currentFileKey]);
  
  const handleZoomOut = useCallback(() => {
    if (!currentFileKey) return;
    setScaleCache(prev => ({ ...prev, [currentFileKey]: Math.max(0.1, (prev[currentFileKey] || 1.0) - 0.2) }));
  }, [currentFileKey]);

  const handleToggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') handleGoToPrevPage();
    else if (event.key === 'ArrowRight') handleGoToNextPage();
    else if (event.key === 'Escape' && isFullscreen) handleToggleFullscreen();
  }, [handleGoToPrevPage, handleGoToNextPage, handleToggleFullscreen, isFullscreen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = tabsContainerRef.current;
    if (target) {
      isDragging.current = true;
      startX.current = e.pageX - target.offsetLeft;
      scrollLeft.current = target.scrollLeft;
      target.style.cursor = 'grabbing';
      target.style.userSelect = 'none';
    }
  };

  const handleMouseLeaveOrUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      const target = tabsContainerRef.current;
      if (target) {
        target.style.cursor = 'grab';
        target.style.removeProperty('user-select');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const target = tabsContainerRef.current;
    if (target) {
      const x = e.pageX - target.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      target.scrollLeft = scrollLeft.current - walk;
    }
  };

  // --- NEW: Panning logic for the preview area ---
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const scrollStart = useRef({ left: 0, top: 0 });

  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !previewContainerRef.current) return;
    const container = previewContainerRef.current;

    // Only start panning if there's overflow content to scroll.
    const hasOverflow = container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight;
    if (!hasOverflow) return;

    e.preventDefault(); // Prevent text selection
    isPanning.current = true;
    panStart.current = { x: e.pageX, y: e.pageY };
    scrollStart.current = { left: container.scrollLeft, top: container.scrollTop };
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = 'none';
    }
  };

  const handlePanMouseUpOrLeave = () => {
    if (!isPanning.current || !previewContainerRef.current) return;
    isPanning.current = false;
    const container = previewContainerRef.current;
    container.style.cursor = 'grab';
    container.style.removeProperty('user-select');
    if (canvasRef.current) {
      canvasRef.current.style.removeProperty('pointer-events');
    }
  };

  const handlePanMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning.current || !previewContainerRef.current) return;
    e.preventDefault();
    const container = previewContainerRef.current;
    const dx = e.pageX - panStart.current.x;
    const dy = e.pageY - panStart.current.y;
    container.scrollLeft = scrollStart.current.left - dx;
    container.scrollTop = scrollStart.current.top - dy;
  };


  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">プレビューするPDFファイルがありません。</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-900 transition-all duration-300 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-4' : 'relative rounded-lg overflow-hidden'
      }`}
    >
      <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <div
          ref={tabsContainerRef}
          className="flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar cursor-grab"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          style={{ scrollbarWidth: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          {files.map((file, index) => (
            <button
              key={getFileKey(file)}
              data-index={index}
              onClick={() => setCurrentFileIndex(index)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                currentFileIndex === index
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <DocumentIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={file.name}>{file.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handleGoToPrevPage} disabled={currentPage <= 1 || isLoading} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="前のページ">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium w-24 text-center tabular-nums">
            {isLoading && !numPages ? '読み込み中...' : `${currentPage} / ${numPages || '...'}`}
          </span>
          <button onClick={handleGoToNextPage} disabled={currentPage >= numPages || isLoading} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="次のページ">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleZoomOut} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="ズームアウト">
             <MagnifyingGlassMinusIcon className="h-5 w-5" />
           </button>
           <span className="text-sm font-medium w-16 text-center tabular-nums">{currentScale > 0 ? `${Math.round(currentScale * 100)}%` : '...'}</span>
           <button onClick={handleZoomIn} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="ズームイン">
             <MagnifyingGlassPlusIcon className="h-5 w-5" />
           </button>
        </div>
        <button onClick={handleToggleFullscreen} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" aria-label={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}>
          {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
        </button>
      </div>
      
      <div
        ref={previewContainerRef}
        className={`flex-grow overflow-auto p-4 flex justify-center items-start relative [&:has(canvas[width]:not([width='0']))]:cursor-grab ${!isFullscreen ? 'max-h-[60vh]' : ''}`}
        onMouseDown={handlePanMouseDown}
        onMouseUp={handlePanMouseUpOrLeave}
        onMouseLeave={handlePanMouseUpOrLeave}
        onMouseMove={handlePanMouseMove}
      >
        {isLoading && (
           <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           </div>
        )}
        <canvas ref={canvasRef} className={`transition-opacity duration-300 ${isLoading || currentScale === 0 ? 'opacity-0' : 'opacity-100'} shadow-lg`}/>
      </div>
    </div>
  );
};

export default PdfPreview;
