'use client'; // Required for useState and event handlers

import { useSelector } from 'react-redux';
import { DrugAutocomplete } from '@/components/molecules/DrugAutocomplete';
import { selectSelectedDrug } from '@/lib/store/slices/drugSearchSlice';
import type { RootState } from '@/lib/store';
import { DrugInformationPanel } from '@/components/organisms/DrugInformationPanel';
import { RouteErrorBoundary } from '@/components/utility/RouteErrorBoundary';
import { ApiErrorBoundary } from '@/components/utility/ApiErrorBoundary';

export default function HomePage() {
  // Get selectedDrug from the Redux store
  const selectedDrug = useSelector((state: RootState) =>
    selectSelectedDrug(state)
  );

  return (
    <RouteErrorBoundary routeName="Home">
      <main className="mx-auto max-w-7xl p-3 md:p-6 lg:p-8">
        <header className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 text-gray-900">
            Drug Information Center
          </h1>
          <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 px-4">
            Search for any medication and get comprehensive information instantly
          </p>
          
          {/* Centered Search Bar */}
          <div className="max-w-sm md:max-w-md mx-auto px-4">
            <ApiErrorBoundary apiName="RxNorm">
              <DrugAutocomplete />
            </ApiErrorBoundary>
          </div>
        </header>

        {/* Drug Information Panel */}
        <div className="mt-6 md:mt-8">
          <ApiErrorBoundary apiName="Drug Information">
            <DrugInformationPanel selectedDrug={selectedDrug} />
          </ApiErrorBoundary>
        </div>
      </main>
    </RouteErrorBoundary>
  );
}
