import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon } from './Icons';

interface CollapsibleSectionProps {
  title: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen: controlledIsOpen, onToggle }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined && onToggle !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle();
    } else {
      setInternalIsOpen(prev => !prev);
    }
  };


  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">{title}</h2>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
