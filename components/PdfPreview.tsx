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
  
  // CHANGED: Caches now use unique string keys instead of array indices
  const [pdfCache, setPdfCache] = useState<Record<string, PdfInfo>>({});
  const [pageCache, setPageCache] = useState<Record<string, number>>({});
  const [scaleCache, setScaleCache] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  // NEW: Effect to clean up caches when files are added or removed
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


  // CHANGED: Derivations are now based on file keys for robustness
  const currentFile = files[currentFileIndex];
  const currentFileKey = currentFile ? getFileKey(currentFile) : null;
  const currentPdfInfo = currentFileKey ? pdfCache[currentFileKey] : undefined;
  const currentPage = currentFileKey ? (pageCache[currentFileKey] || 1) : 1;
  const currentScale = currentFileKey ? (scaleCache[currentFileKey] || 1.5) : 1.5;
  const numPages = currentPdfInfo?.numPages || 0;

  // Load PDF document when file selection or index changes
  useEffect(() => {
    if (!files || files.length === 0) {
      return;
    }

    if (currentFileIndex >= files.length) {
      setCurrentFileIndex(0);
      return;
    }
    
    const activeTab = tabsContainerRef.current?.querySelector(`[data-index="${currentFileIndex}"]`);
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const file = files[currentFileIndex];
    if (!file) return;

    const fileKey = getFileKey(file);

    if (!pdfCache[fileKey]) {
      const loadPdf = async () => {
        setIsLoading(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdfCache(prev => ({
            ...prev,
            [fileKey]: { doc: pdf, numPages: pdf.numPages },
          }));
        } catch (error) {
          console.error(`Error loading PDF ${file.name}:`, error);
        } finally {
          setIsLoading(false);
        }
      };
      loadPdf();
    }
  }, [files, currentFileIndex, pdfCache]);
  
  // Render page when document, page number, or scale changes
  useEffect(() => {
    if (!currentPdfInfo || !canvasRef.current) return;
    
    let isCancelled = false;
    const renderPage = async () => {
      setIsLoading(true);
      try {
        const page = await currentPdfInfo.doc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: currentScale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (error) {
        if (!isCancelled) console.error("Error rendering page:", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    
    renderPage();
    return () => { isCancelled = true; };
  }, [currentPdfInfo, currentPage, currentScale]);
  
  // CHANGED: Handlers now use file keys
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
    setScaleCache(prev => ({ ...prev, [currentFileKey]: Math.min(3, (prev[currentFileKey] || 1.5) + 0.2) }));
  }, [currentFileKey]);
  
  const handleZoomOut = useCallback(() => {
    if (!currentFileKey) return;
    setScaleCache(prev => ({ ...prev, [currentFileKey]: Math.max(0.5, (prev[currentFileKey] || 1.5) - 0.2) }));
  }, [currentFileKey]);

  const handleToggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') handleGoToPrevPage();
    else if (event.key === 'ArrowRight') handleGoToNextPage();
    else if (event.key === 'Escape') handleToggleFullscreen();
  }, [handleGoToPrevPage, handleGoToNextPage, handleToggleFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, handleKeyDown]);
  
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
              key={getFileKey(file)} // CHANGED: Use unique key
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
           <span className="text-sm font-medium w-16 text-center tabular-nums">{Math.round(currentScale * 100)}%</span>
           <button onClick={handleZoomIn} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="ズームイン">
             <MagnifyingGlassPlusIcon className="h-5 w-5" />
           </button>
        </div>
        <button onClick={handleToggleFullscreen} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" aria-label={isFullscreen ? "フルスクリーン解除" : "フルスクリーン"}>
          {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
        </button>
      </div>
      
      <div className="flex-grow overflow-auto p-4 flex justify-center items-start relative">
        {isLoading && (
           <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           </div>
        )}
        <canvas ref={canvasRef} className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'} shadow-lg`}/>
      </div>
    </div>
  );
};

export default PdfPreview;
