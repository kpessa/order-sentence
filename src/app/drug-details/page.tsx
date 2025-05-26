'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Mock data structure for FDA sections
interface FdaSection {
  title: string;
  content: string | string[]; // Content can be a single string or a list of paragraphs
}

const mockFdaData: Record<string, FdaSection[]> = {
  default: [
    { title: 'Indications and Usage', content: 'No specific mock data for this drug yet.' },
    { title: 'Dosage and Administration', content: 'Please consult a healthcare professional.' },
  ],
  '153165': [ // Mock data for Atorvastatin (RxCUI for Lipitor's ingredient)
    { title: 'Indications and Usage', content: 'Used to lower cholesterol and reduce the risk of cardiovascular events.' },
    { title: 'Dosage and Administration', content: ['Typical starting dose is 10 or 20 mg once daily.', 'Dosage range is 10 to 80 mg once daily.'] },
    { title: 'Contraindications', content: 'Active liver disease, pregnancy, and breastfeeding.' },
    { title: 'Warnings and Precautions', content: 'Skeletal muscle effects (e.g., myopathy, rhabdomyolysis) have been reported.' },
  ],
  '123': [ // Mock data for Lisinopril
    { title: 'Indications and Usage', content: 'Used to treat high blood pressure (hypertension) and heart failure.' },
    { title: 'Dosage and Administration', content: 'Initial dose: 10 mg once daily. Maintenance: 20 to 40 mg per day.' },
    { title: 'Contraindications', content: 'History of angioedema related to previous ACE inhibitor treatment.' },
    { title: 'Warnings and Precautions', content: 'Can cause symptomatic hypotension. Monitor renal function.' },
  ],
};

function DrugDetailsContent() {
    const searchParams = useSearchParams();
    const rxcui = searchParams.get('rxcui');
    const drugName = searchParams.get('name');

    if (!rxcui || !drugName) {
        return <p>Drug information not provided. Please select a drug first.</p>;
    }

    const fdaSections = mockFdaData[rxcui] || mockFdaData.default;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">openFDA Package Insert for: {decodeURIComponent(drugName)} (RxCUI: {rxcui})</h1>
            <p className="mb-6 text-gray-600">Displaying mock FDA package insert information. Future implementation will fetch and parse data from the openFDA API.</p>
            
            <div className="space-y-6">
                {fdaSections.map((section, index) => (
                    <section key={index} className="p-4 border border-gray-200 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold mb-2 text-blue-700">{section.title}</h2>
                        {typeof section.content === 'string' ? (
                            <p>{section.content}</p>
                        ) : (
                            <ul className="list-disc list-inside space-y-1">
                                {section.content.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
}

export default function DrugDetailsPage() {
  return (
    <main className="container mx-auto p-4">
        <Suspense fallback={<div>Loading drug details...</div>}>
            <DrugDetailsContent />
        </Suspense>
    </main>
  );
} 