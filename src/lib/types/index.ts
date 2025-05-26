export interface SelectedDrugInfo {
  name: string;        // Generic or brand name
  rxcui: string;       // RxNorm Concept Unique Identifier
  tty: string;         // Term Type (IN=Ingredient, BN=Brand Name, etc.)
  isIngredient: boolean; // Whether this is an active ingredient
}

export interface NavigationHistoryEntry {
  path: string;
  timestamp: string; // Using string for ISO date format
  params?: Record<string, any>;
}

export interface AppState {
  sessionId: string;
  currentView: 'search' | 'results' | 'details'; // Corresponds to pages/routes
  currentWorkflow: 'cerner' | 'openfda' | null;
  selectedDrug: SelectedDrugInfo | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  pageViews: NavigationHistoryEntry[];
}

// As per Excel/CSV Data
export interface OrderSentenceRow {
  "Generic Name": string;
  "Brand Name": string;
  "Strength": string;
  "Form": string;
  "Route": string;
  "Frequency": string;
  "Order Type": 'PRN' | 'Scheduled' | 'Once';
  "Order Sentence": string;
}

// As per Cerner Results Structure (processed/structured data)
export interface CernerOrderSentence {
  id: string; // Likely a generated unique ID for table rows or from a database
  rxcui?: string; // RxCUI of the drug involved in this sentence
  drugName?: string; // Name of the drug this sentence is for
  originalOrderSentence: string; // The full "Order Sentence" from OrderSentenceRow
  strength?: string; // From OrderSentenceRow
  form?: string; // From OrderSentenceRow
  route?: string; // From OrderSentenceRow
  frequency?: string; // From OrderSentenceRow
  orderType?: 'PRN' | 'Scheduled' | 'Once'; // From OrderSentenceRow
  // Derived or additional fields can be added here
}

// For RxNorm API responses (approximateTerm)
export interface RxNormSuggestion {
  rxcui: string;
  name: string;
  tty: string;
  synonym?: string;
  score?: string; // Approximate match score
}

export interface RxNormApproximateTermResponse {
  approximateGroup?: {
    inputTerm: string;
    candidate: Array<{
      rxcui: string;
      rxaui: string; // RxNorm Atom Unique Identifier
      score: string;
      rank: string;
    }>;
  };
  // Or other structures depending on the exact RxNorm endpoint variant
  // For /approximateTerm.json?term=value&maxEntries=4&option=1
  // it's more like:
  // {
  //   "approximateGroup": {
  //     "inputTerm": "lipitor",
  //     "candidate": [
  //       { "rxcui": "153165", "score": "1" },
  //       { "rxcui": "202432", "score": "1" }
  //     ]
  //   }
  // }
  // We'll need another call to get names for these RXCUIs.
  // A better endpoint might be /drugs.json?name=sildenafil or /spellingsuggestions.json
}

// For RxNorm drug properties
export interface RxNormProperty {
  propName: string;
  propValue: string;
}

export interface RxNormPropertiesResponse {
  properties?: {
    rxcui: string;
    name: string;
    synonym: string;
    tty: string;
    language: string;
    suppress: string;
    umlscui: string;
    // ... and other properties
  };
  propertyConceptList?: { // for /rxcui/{id}/property.json?propName=TTY
    propertyConcept?: Array<{
        propName: string;
        propValue: string;
    }>;
  };
} 