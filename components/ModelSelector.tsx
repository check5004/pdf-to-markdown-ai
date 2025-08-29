import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OpenRouterModel } from '../types.ts';
import { ChevronDownIcon, CheckIcon, BookOpenIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PhotoIcon, DocumentTextIcon, MicrophoneIcon, VideoCameraIcon, WrenchScrewdriverIcon, BrainIcon } from './Icons.tsx';

interface ModelSelectorProps {
  model: string;
  setModel: (modelId: string) => void;
  models: OpenRouterModel[];
  disabled: boolean;
}

const formatCost = (costStr: string): string => {
  const cost = parseFloat(costStr);
  if (isNaN(cost) || cost === 0) {
    return "Free";
  }
  return `$${cost.toFixed(4)} / 1M`;
};


const ModelSelector: React.FC<ModelSelectorProps> = ({ model, setModel, models, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoveredModel, setHoveredModel] = useState<OpenRouterModel | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const getSelectedModelName = useCallback(() => {
    return models.find(m => m.id === model)?.name || '';
  }, [models, model]);

  useEffect(() => {
    // This effect ensures the input field shows the selected model's name
    // whenever the selection changes OR when the dropdown is closed.
    if (!isOpen) {
      setQuery(getSelectedModelName());
    }
  }, [model, isOpen, getSelectedModelName]);
  
  const filteredModels = query === '' || query === getSelectedModelName()
    ? models
    : models.filter((m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.id.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, isOpen]);

  useEffect(() => {
    if (isOpen && activeIndex !== -1 && listRef.current) {
        const item = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
        item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSelectModel = (modelId: string) => {
    setModel(modelId);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setActiveIndex(prev => (prev + 1) % (filteredModels.length || 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setActiveIndex(prev => (prev - 1 + (filteredModels.length || 1)) % (filteredModels.length || 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && activeIndex < filteredModels.length) {
          handleSelectModel(filteredModels[activeIndex].id);
        } else if (!isOpen) {
            setIsOpen(true);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="model-selector-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        モデル
      </label>
      <div className="relative mt-1">
        <div className="relative">
            <input
              ref={inputRef}
              id="model-selector-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => {
                if (query === getSelectedModelName()) {
                  setQuery('');
                }
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? "APIキーを入力してください" : "モデルを検索..."}
              autoComplete="off"
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="model-listbox"
              aria-activedescendant={activeIndex >= 0 ? `model-option-${activeIndex}` : undefined}
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className="absolute inset-y-0 right-0 flex items-center pr-2 rounded-r-md focus:outline-none"
              aria-label="モデルリストを開く"
              tabIndex={-1}
            >
              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </button>
        </div>

        {isOpen && !disabled && (
          <ul 
            ref={listRef}
            id="model-listbox"
            className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
            role="listbox"
            onMouseLeave={() => setHoveredModel(null)}
            onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
          >
            {filteredModels.length > 0 ? (
              filteredModels.map((m, index) => (
                <li
                  key={m.id}
                  id={`model-option-${index}`}
                  data-index={index}
                  onClick={() => handleSelectModel(m.id)}
                  onMouseEnter={(e) => {
                    setActiveIndex(index);
                    setHoveredModel(m);
                    const itemRect = e.currentTarget.getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    if (containerRect) {
                        setTooltipStyle({
                            top: `${itemRect.top - containerRect.top}px`,
                            left: `${itemRect.width}px`,
                        });
                    }
                  }}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors ${
                    activeIndex === index ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-gray-200'
                  } ${
                    activeIndex !== index ? 'hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }`}
                  role="option"
                  aria-selected={model === m.id}
                >
                  <div className="flex items-center justify-between">
                    <span className={`block truncate ${model === m.id ? 'font-semibold' : 'font-normal'}`}>
                      {m.name}
                    </span>
                    <div className={`flex items-center gap-1.5 ml-2 flex-shrink-0 ${activeIndex === index ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                        {m.modality_types.includes('text') && <DocumentTextIcon className="h-4 w-4" title="Text Input" />}
                        {m.modality_types.includes('image_input') && <PhotoIcon className="h-4 w-4" title="Image Input" />}
                        {m.modality_types.includes('audio_input') && <MicrophoneIcon className="h-4 w-4" title="Audio Input" />}
                        {m.modality_types.includes('video_input') && <VideoCameraIcon className="h-4 w-4" title="Video Input" />}
                        {m.modality_types.includes('tool_use') && <WrenchScrewdriverIcon className="h-4 w-4" title="Tool Use" />}
                        {m.supports_thinking && <BrainIcon className="h-4 w-4" title="Thinking Support" />}
                    </div>
                  </div>
                  {model === m.id && (
                    <span className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                        activeIndex === index ? 'text-white' : 'text-primary-600'
                    }`}>
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="cursor-default select-none relative py-2 px-4 text-gray-700 dark:text-gray-300">
                {models.length > 0 ? "モデルが見つかりません" : "モデルを読み込み中..."}
              </li>
            )}
          </ul>
        )}
      </div>

       {/* Tooltip Element */}
      {isOpen && hoveredModel && (
        <div
          style={tooltipStyle}
          className="absolute ml-2 w-72 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-600 z-20 pointer-events-none"
        >
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-900 dark:text-white text-base">{hoveredModel.name}</h4>
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              {hoveredModel.modality_types.includes('text') && <DocumentTextIcon className="h-5 w-5" title="Text Input" />}
              {hoveredModel.modality_types.includes('image_input') && <PhotoIcon className="h-5 w-5" title="Image Input" />}
              {hoveredModel.modality_types.includes('audio_input') && <MicrophoneIcon className="h-5 w-5" title="Audio Input" />}
              {hoveredModel.modality_types.includes('video_input') && <VideoCameraIcon className="h-5 w-5" title="Video Input" />}
              {hoveredModel.modality_types.includes('tool_use') && <WrenchScrewdriverIcon className="h-5 w-5" title="Tool Use" />}
              {hoveredModel.supports_thinking && <BrainIcon className="h-5 w-5" title="Thinking Support" />}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2 max-h-24 overflow-y-auto">{hoveredModel.description}</p>
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
                <BookOpenIcon className="h-4 w-4 text-primary-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Context:</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{hoveredModel.context_length.toLocaleString()}</span>
            </div>
             <div className="flex items-center gap-2">
                <ArrowUpCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Prompt:</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{formatCost(hoveredModel.pricing.prompt)}</span>
            </div>
             <div className="flex items-center gap-2">
                <ArrowDownCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Complete:</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{formatCost(hoveredModel.pricing.completion)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;