
export const sanitizeFilename = (name: string): string => {
    if (!name) return 'document.md';
    let sanitized = name.replace(/[/\\?%*:|"<>]/g, '-');
    sanitized = sanitized.replace(/\s+/g, '_');
    
    if (!sanitized.toLowerCase().endsWith('.md')) {
        const lastDotIndex = sanitized.lastIndexOf('.');
        if (lastDotIndex > -1) {
            sanitized = sanitized.substring(0, lastDotIndex);
        }
        sanitized += '.md';
    }
    return sanitized.substring(0, 250);
};

export const extractFilenameFromMarkdown = (markdown: string): string => {
  if (!markdown) return 'document.md';
  const match = markdown.match(/^#\s+([^\n]+)/);
  if (match && match[1]) {
    return sanitizeFilename(match[1].trim());
  }
  return 'document.md';
};


export const formatCost = (costStr: string): string => {
  const cost = parseFloat(costStr);
  if (isNaN(cost) || cost === 0) {
    return "Free";
  }
  return `$${cost.toFixed(4)} / 1M tokens`;
};
