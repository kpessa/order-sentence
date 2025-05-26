'use client'; // Required for useState and event handlers

import { useState } from 'react';
import { DrugAutocomplete } from '@/components/molecules/DrugAutocomplete';
import { WorkflowSelector } from '@/components/molecules/WorkflowSelector';
import { SelectedDrugInfo } from '@/lib/types';

export default function HomePage() {
  const [selectedDrug, setSelectedDrug] = useState<SelectedDrugInfo | null>(null);

  const handleDrugSelection = (drug: SelectedDrugInfo) => {
    setSelectedDrug(drug);
    console.log('Drug selected on HomePage:', drug);
  };

  return (
    <main className="container mx-auto p-4">
      <header className="mb-10">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-800">Comprehensive Drug Analysis</h1>
        <p className="text-lg text-gray-600 text-center">Search for medications and explore detailed information workflows.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <section id="drug-search" className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-semibold mb-5 text-blue-700 border-b pb-2">Step 1: Drug Search & Selection</h2>
          <DrugAutocomplete onDrugSelected={handleDrugSelection} />
        </section>

        <section id="workflow-selection" className={`p-6 bg-white shadow-lg rounded-lg ${!selectedDrug ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <h2 className="text-2xl font-semibold mb-5 text-blue-700 border-b pb-2">Step 2: Workflow Selection</h2>
          <WorkflowSelector selectedDrug={selectedDrug} />
          {!selectedDrug && (
            <p className="text-sm text-gray-500 mt-4">Please select a drug to enable workflow options.</p>
          )}
        </section>
      </div>

      {selectedDrug && (
        <section id="selected-drug-info" className="mt-10 p-6 bg-gray-50 shadow-md rounded-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">Currently Selected Drug:</h3>
          <div className="text-gray-800">
            <p><strong>Name:</strong> {selectedDrug.name}</p>
            <p><strong>RxCUI:</strong> {selectedDrug.rxcui}</p>
            <p><strong>Type:</strong> {selectedDrug.tty} {selectedDrug.isIngredient ? '(Ingredient)' : ''}</p>
          </div>
        </section>
      )}

      {/* <DebugPanel /> */}
    </main>
  );
} 