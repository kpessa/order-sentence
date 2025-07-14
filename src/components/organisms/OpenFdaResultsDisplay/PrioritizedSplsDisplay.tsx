import React from 'react';
import { ParsedSplProductData } from '@/lib/utils/splPrioritization';

interface PrioritizedSplsDisplayProps {
  prioritizedSpls: Record<string, ParsedSplProductData>;
  openFdaStatus: string;
  isLoadingPrioritization: boolean;
  setIdsToPrioritize: Set<string>;
  dailyMedDetails: Record<string, any>;
}

export const PrioritizedSplsDisplay: React.FC<PrioritizedSplsDisplayProps> = ({
  prioritizedSpls,
  openFdaStatus,
  isLoadingPrioritization,
  setIdsToPrioritize,
  dailyMedDetails,
}) => {
  const canDisplayPrioritized =
    openFdaStatus === 'succeeded' || openFdaStatus === 'fda_queried';
  if (!canDisplayPrioritized && Object.keys(prioritizedSpls).length === 0) {
    return null;
  }
  if (Object.keys(prioritizedSpls).length === 0) {
    if (isLoadingPrioritization)
      return (
        <p className="text-center text-gray-600 mt-4">
          Processing and prioritizing SPLs...
        </p>
      );
    if (openFdaStatus === 'succeeded' || openFdaStatus === 'fda_queried') {
      if (
        setIdsToPrioritize.size > 0 &&
        Array.from(setIdsToPrioritize).every(
          (setId) =>
            dailyMedDetails[setId] &&
            dailyMedDetails[setId]?.status !== 'loading'
        )
      ) {
        return (
          <p className="text-center text-gray-600 mt-4">
            No SPLs could be prioritized with the available data (e.g., missing
            XML, dosage forms, or other criteria).
          </p>
        );
      }
      return (
        <p className="text-center text-gray-600 mt-4">
          Click &quot;Process/Reprocess SPLs&quot; to attempt prioritization.
        </p>
      );
    }
    return null;
  }
  return (
    <div className="mt-8 pt-6 border-t">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Prioritized SPLs by Dosage Form:
      </h3>
      {Object.entries(prioritizedSpls).map(
        ([dosageForm, splDetail]: [string, ParsedSplProductData]) => (
          <div
            key={dosageForm}
            className="mb-4 p-4 border rounded-lg shadow-sm bg-white"
          >
            <h4 className="text-lg font-semibold text-green-700">
              {dosageForm}
            </h4>
            {splDetail && splDetail.spl_set_id ? (
              <>
                <p className="text-sm text-gray-700">
                  <strong>Selected SET ID:</strong> {splDetail.spl_set_id}
                </p>
                {splDetail.xml_content ? (
                  <p className="text-sm text-gray-700">
                    <strong>XML Content:</strong> Yes (Length:{' '}
                    {splDetail.xml_content.length})
                  </p>
                ) : (
                  <p className="text-sm text-red-500">
                    <strong>XML Content:</strong> No
                  </p>
                )}
                <a
                  href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${splDetail.spl_set_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View on DailyMed
                </a>
                {splDetail.dosageAndAdministrationText && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600">
                      Dosage & Administration (Preview):
                    </p>
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded whitespace-pre-wrap overflow-x-auto max-h-48">
                      {splDetail.dosageAndAdministrationText.substring(0, 500)}
                      {splDetail.dosageAndAdministrationText.length > 500
                        ? '...'
                        : ''}
                    </p>
                  </div>
                )}
                {!splDetail.dosageAndAdministrationText && (
                  <p className="text-xs text-gray-500 mt-1">
                    Dosage & Administration text not found in this SPL.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Details not available for this dosage form.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
};
