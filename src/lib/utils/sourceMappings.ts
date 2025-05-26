export interface SourceInfo {
  fullName: string;
  colorClasses: string; // e.g., 'bg-blue-100 text-blue-700'
}

export const SOURCE_INFO_MAP: Record<string, SourceInfo> = {
  USP: {
    fullName: 'United States Pharmacopeia',
    colorClasses: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  GS: {
    fullName: 'Gold Standard',
    colorClasses: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  },
  RXNORM: {
    fullName: 'RxNorm',
    colorClasses: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
  MMSL: {
    fullName: 'Multum',
    colorClasses: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  },
  VANDF: {
    fullName: 'VA National Drug File',
    colorClasses: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  },
  NDDF: {
    fullName: 'FDB National Drug Data File',
    colorClasses: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
  },
  ATC: {
    fullName: 'ATC Classification',
    colorClasses: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  DRUGBANK: {
    fullName: 'DrugBank',
    colorClasses: 'bg-teal-100 text-teal-700 hover:bg-teal-200',
  },
  // Add other mappings as needed
};

export const getSourceInfo = (acronym?: string): SourceInfo => {
  if (!acronym) {
    return { fullName: 'N/A', colorClasses: 'bg-gray-100 text-gray-700 hover:bg-gray-200' };
  }
  return SOURCE_INFO_MAP[acronym.toUpperCase()] || { fullName: acronym, colorClasses: 'bg-gray-100 text-gray-700 hover:bg-gray-200' };
}; 