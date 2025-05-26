export interface ColumnStyling {
  bg: string; // e.g., 'bg-blue-100'
  text: string; // e.g., 'text-blue-800'
  border: string; // e.g., 'border-blue-500'
  pillActiveBg: string; // e.g., 'bg-blue-500'
  pillActiveText: string; // e.g., 'text-white'
  pillInactiveBorder: string; // e.g., 'border-blue-400'
  pillInactiveText: string; // e.g., 'text-blue-700'
  cellBg: string; // For column cell background, e.g., 'bg-blue-100/30' or 'bg-blue-50'
}

export const columnStyles: Record<string, ColumnStyling> = {
  'Default': {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-400',
    pillActiveBg: 'bg-slate-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-slate-400',
    pillInactiveText: 'text-slate-700',
    cellBg: 'bg-slate-50', // Lighter than bg-slate-100
  },
  'Description': {
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-500',
    pillActiveBg: 'bg-sky-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-sky-400',
    pillInactiveText: 'text-sky-700',
    cellBg: 'bg-sky-50',
  },
  'Encounter Group': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-500',
    pillActiveBg: 'bg-emerald-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-emerald-400',
    pillInactiveText: 'text-emerald-700',
    cellBg: 'bg-emerald-50',
  },
  'Synonym': {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-500',
    pillActiveBg: 'bg-amber-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-amber-400',
    pillInactiveText: 'text-amber-700',
    cellBg: 'bg-amber-50',
  },
  'Synonym Type': {
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    border: 'border-violet-500',
    pillActiveBg: 'bg-violet-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-violet-400',
    pillInactiveText: 'text-violet-700',
    cellBg: 'bg-violet-50',
  },
  'Catalog Type': {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    border: 'border-pink-500',
    pillActiveBg: 'bg-pink-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-pink-400',
    pillInactiveText: 'text-pink-700',
    cellBg: 'bg-pink-50',
  },
  'Order Entry Format': {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-500',
    pillActiveBg: 'bg-teal-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-teal-400',
    pillInactiveText: 'text-teal-700',
    cellBg: 'bg-teal-50',
  },
  'Order Sentence': {
    bg: 'bg-gray-200', // Slightly darker for header to stand out
    text: 'text-gray-800',
    border: 'border-gray-400',
    pillActiveBg: 'bg-gray-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-gray-400',
    pillInactiveText: 'text-gray-700',
    cellBg: 'bg-gray-50', // Lighter gray for cells
  },
  'Sentence': { // Added specifically for the 'Sentence' accessorKey if different from 'Order Sentence' visual title
    bg: 'bg-gray-200',
    text: 'text-gray-800',
    border: 'border-gray-400',
    pillActiveBg: 'bg-gray-500',
    pillActiveText: 'text-white',
    pillInactiveBorder: 'border-gray-400',
    pillInactiveText: 'text-gray-700',
    cellBg: 'bg-gray-50',
  },
  // Add more column styles as needed
};

export const getColumnStyles = (columnName: string): ColumnStyling => {
  return columnStyles[columnName] || columnStyles['Default'];
}; 