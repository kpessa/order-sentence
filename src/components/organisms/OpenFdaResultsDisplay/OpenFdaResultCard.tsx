import React from 'react';
import { OpenFdaResult } from '@/lib/store/slices/fdaDataSlice';

interface OpenFdaResultCardProps {
  result: OpenFdaResult;
  dailyMedDetails: Record<string, any>;
  dispatch: any;
  fetchSplDetailFromDailyMed: (setId: string) => any;
  CustomButton: any;
}

export const OpenFdaResultCard: React.FC<OpenFdaResultCardProps> = ({
  result,
  dailyMedDetails,
  dispatch,
  fetchSplDetailFromDailyMed,
  CustomButton,
}) => {
  const brandName = result.openfda?.brand_name?.join(', ') || (result as any).brand_name || 'Unknown Brand';
  const genericName = result.openfda?.generic_name?.join(', ') || (result as any).generic_name || 'Unknown Generic';
  const manufacturerName = result.openfda?.manufacturer_name?.join(', ') || (result as any).sponsor_name || 'Unknown Manufacturer';
  const setIdsForResult = result.openfda?.spl_set_id || ((result as any).set_id ? [(result as any).set_id] : []);

  return (
    <div className="p-3 border rounded-md shadow-sm bg-slate-50 flex flex-col justify-between">
      <div>
        <h4 className="text-md font-semibold text-blue-700">{brandName}</h4>
        <p className="text-sm text-gray-600">Generic: {genericName}</p>
        <p className="text-xs text-gray-500">Manuf: {manufacturerName}</p>
        {result.application_number && <p className="text-xs text-gray-500">App No: {result.application_number}</p>}
        {result.dosage_form && <p className="text-xs text-gray-500">Form (Source): {result.dosage_form}</p>}
      </div>
      {setIdsForResult.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs font-medium text-gray-600 mb-1">SPL SET IDs:</p>
          {setIdsForResult.map((setId: string) => {
            const detailEntry = dailyMedDetails[setId];
            const isLoadingDetail = detailEntry?.status === 'loading';
            const hasXml = !!detailEntry?.data?.xml_content;
            const fetchFailed = detailEntry?.status === 'failed';
            return (
              <div key={setId} className="mb-1 text-xs">
                <span>{setId}</span>
                {isLoadingDetail && <span className="ml-1 text-blue-500">(Loading XML...)</span>}
                {!isLoadingDetail && detailEntry?.status === 'succeeded' && hasXml && <span className="ml-1 text-green-500">(XML Loaded)</span>}
                {!isLoadingDetail && detailEntry?.status === 'succeeded' && !hasXml && <span className="ml-1 text-orange-500">(XML Not Found/Empty)</span>}
                {fetchFailed && <span className="ml-1 text-red-500">(Error fetching XML)</span>}
                {!isLoadingDetail && !hasXml && !fetchFailed && (!detailEntry || detailEntry.status === 'idle') && (
                  <CustomButton 
                    label="Fetch XML"
                    onClick={() => dispatch(fetchSplDetailFromDailyMed(setId))}
                    variant="link"
                    className="ml-2 text-blue-600 hover:underline p-0 h-auto"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}; 