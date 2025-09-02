import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowsPointingOutIcon, XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingInIcon } from './Icons';

// pdf.js is loaded from CDN, so we need to declare its global object
declare const pdfjsLib: any;

// A simple debounce utility function
function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Fix: Define the props interface for the PdfPreview component.
interface PdfPreviewProps {
  file: File | null;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file }) => {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstPageViewport, setFirstPageViewport] = useState<any>(null);

  // Preview state
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [previewHeight, setPreviewHeight] = useState<number | string>('auto');
  const previewRenderTask = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1.0);
  const modalRenderTasks = useRef(new Map());
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Panning state for main preview
  const [isPanning, setIsPanning] = useState(false);
  const panState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // Panning state for modal
  const [isModalPanning, setIsModalPanning] = useState(false);
  const modalPanState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });


  // 1. Load PDF when file changes
  useEffect(() => {
    // Cleanup previous state
    if (previewRenderTask.current) {
        previewRenderTask.current.cancel();
        previewRenderTask.current = null;
    }
    if (!file) {
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setError(null);
      setPreviewHeight('auto');
      setFirstPageViewport(null);
      return;
    }

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fileBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
        const doc = await loadingTask.promise;
        const page1 = await doc.getPage(1);
        
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setFirstPageViewport(page1.getViewport({ scale: 1 }));
      } catch (err: any) {
        console.error("Failed to load PDF", err);
        setError('PDFの読み込みに失敗しました。ファイルが破損しているか、サポートされていない形式の可能性があります。');
        setPdfDoc(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [file]);

  // 2. Calculate initial dimensions and handle window resize (DEBOUNCED)
  useEffect(() => {
    if (!firstPageViewport || !canvasContainerRef.current) return;

    const calculateDimensions = () => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;
      
      const scale = containerWidth / firstPageViewport.width;
      const newHeight = firstPageViewport.height * scale;
      
      setPreviewHeight(newHeight);
      setPreviewZoom(scale);
    };

    const debouncedCalculate = debounce(calculateDimensions, 150);

    const timer = setTimeout(calculateDimensions, 50);
    window.addEventListener('resize', debouncedCalculate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', debouncedCalculate);
    };
  }, [firstPageViewport]);

  // 3. Render the MAIN preview page, with cancellation
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || previewZoom <= 0) return;

    let isCancelled = false;

    const render = async () => {
      // Cancel any previous render task before starting a new one
      if (previewRenderTask.current) {
        previewRenderTask.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: previewZoom });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (canvas && context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = { canvasContext: context, viewport };
          const task = page.render(renderContext);
          previewRenderTask.current = task;
          
          await task.promise;
        }
      } catch (err: any) {
        // Don't log an error if it's a deliberate cancellation
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${currentPage}:`, err);
          setError('ページの描画に失敗しました。');
        }
      } finally {
        if (previewRenderTask.current?.internalRenderTask?.state === 'finished') {
             previewRenderTask.current = null;
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (previewRenderTask.current) {
        previewRenderTask.current.cancel();
        previewRenderTask.current = null;
      }
    };
  }, [pdfDoc, currentPage, previewZoom]);

  // 4. Render ALL modal pages, with cancellation
  const renderAllModalPages = useCallback(async (scale: number) => {
    if (!pdfDoc || !isModalOpen) return;

    // Cancel all previous modal render tasks
    modalRenderTasks.current.forEach(task => task.cancel());
    modalRenderTasks.current.clear();

    const renderPromises = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const promise = (async () => {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = document.getElementById(`modal-canvas-${pageNum}`) as HTMLCanvasElement;
          if (canvas) {
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const task = page.render({ canvasContext: context, viewport });
            modalRenderTasks.current.set(pageNum, task);
            await task.promise;
          }
        } catch (err: any) {
          if (err.name !== 'RenderingCancelledException') {
            console.error(`Error rendering modal page ${pageNum}:`, err);
          }
        } finally {
            modalRenderTasks.current.delete(pageNum);
        }
      })();
      renderPromises.push(promise);
    }
    await Promise.all(renderPromises);
  }, [pdfDoc, isModalOpen, numPages]);

  useEffect(() => {
    if (isModalOpen && modalZoom > 0) {
      renderAllModalPages(modalZoom);
    }
    // Cleanup when modal closes or component unmounts
    return () => {
      modalRenderTasks.current.forEach(task => task.cancel());
      modalRenderTasks.current.clear();
    };
  }, [isModalOpen, modalZoom, renderAllModalPages]);

  // Modal fit-to-width calculation
  const handleFitToWidth = useCallback(() => {
    if (!firstPageViewport || !modalContentRef.current) return;
    const containerWidth = modalContentRef.current.clientWidth;
    const newScale = (containerWidth - 32) / firstPageViewport.width; // Account for padding
    setModalZoom(newScale);
  }, [firstPageViewport]);

  // Set initial modal zoom when it opens
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(handleFitToWidth, 50); // Delay to ensure modal is rendered
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, handleFitToWidth]);
  
  // Panning handlers for main preview
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !canvasContainerRef.current) return;
    e.preventDefault();
    setIsPanning(true);
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: canvasContainerRef.current.scrollLeft,
      scrollTop: canvasContainerRef.current.scrollTop,
    };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !canvasContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    canvasContainerRef.current.scrollLeft = panState.current.scrollLeft - dx;
    canvasContainerRef.current.scrollTop = panState.current.scrollTop - dy;
  };

  // Panning handlers for modal
  const handleModalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !modalContentRef.current) return;
    e.preventDefault();
    setIsModalPanning(true);
    modalPanState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: modalContentRef.current.scrollLeft,
      scrollTop: modalContentRef.current.scrollTop,
    };
  };

  const handleModalMouseUp = () => {
    setIsModalPanning(false);
  };

  const handleModalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isModalPanning || !modalContentRef.current) return;
    e.preventDefault();
    const dx = e.clientX - modalPanState.current.startX;
    const dy = e.clientY - modalPanState.current.startY;
    modalContentRef.current.scrollLeft = modalPanState.current.scrollLeft - dx;
    modalContentRef.current.scrollTop = modalPanState.current.scrollTop - dy;
  };


  if (!file) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">PDFをアップロードするとここにプレビューが表示されます。</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin h-6 w-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-3 text-gray-600 dark:text-gray-400">PDFを読み込み中...</span>
      </div>
    );
  }

  if (error || !pdfDoc) {
    return (
       <div className="flex items-center justify-center h-48 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 p-4 rounded-lg text-center">
         {error || 'PDFの読み込みに失敗しました。'}
       </div>
    );
  }

  const controlButtonClasses = "p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500";
  
  return (
    <div className="space-y-4">
      <div className="relative group">
        <div
          ref={canvasContainerRef}
          style={{ height: typeof previewHeight === 'number' ? `${previewHeight}px` : previewHeight }}
          className={`w-full border dark:border-gray-600 rounded-md shadow-inner overflow-auto transition-all duration-200 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 focus:bg-black/60 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="拡大表示"
        >
          <ArrowsPointingOutIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center space-x-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className={controlButtonClasses} aria-label="前のページ">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ページ {currentPage} / {numPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className={controlButtonClasses} aria-label="次のページ">
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPreviewZoom(z => Math.max(0.25, z - 0.25))} className={controlButtonClasses} aria-label="縮小"><MagnifyingGlassMinusIcon className="h-5 w-5" /></button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-center tabular-nums">{Math.round(previewZoom * 100)}%</span>
            <button onClick={() => setPreviewZoom(z => z + 0.25)} className={controlButtonClasses} aria-label="拡大"><MagnifyingGlassPlusIcon className="h-5 w-5" /></button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
           <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
           `}</style>
          <div
            className="relative w-[90vw] h-[90vh] flex flex-col bg-gray-600 rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div
              ref={modalContentRef}
              className={`relative w-full h-full flex-grow overflow-auto p-4 space-y-4 text-center ${isModalPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleModalMouseDown}
              onMouseMove={handleModalMouseMove}
              onMouseUp={handleModalMouseUp}
              onMouseLeave={handleModalMouseUp}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <canvas key={i} id={`modal-canvas-${i + 1}`} className="max-w-none bg-white shadow-lg mx-auto" />
              ))}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/70 backdrop-blur-sm rounded-full shadow-lg">
                <button onClick={() => setModalZoom(z => Math.max(0.1, z - 0.25))} className="p-2 text-white rounded-full hover:bg-white/20" aria-label="縮小"><MagnifyingGlassMinusIcon className="h-6 w-6" /></button>
                <button onClick={handleFitToWidth} className="p-2 text-white rounded-full hover:bg-white/20" aria-label="幅に合わせる"><ArrowsPointingInIcon className="h-6 w-6" /></button>
                <span className="text-white font-mono w-16 text-center text-sm tabular-nums">{Math.round(modalZoom * 100)}%</span>
                <button onClick={() => setModalZoom(z => z + 0.25)} className="p-2 text-white rounded-full hover:bg-white/20" aria-label="拡大"><MagnifyingGlassPlusIcon className="h-6 w-6" /></button>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/75 transition-colors" aria-label="閉じる">
                <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;