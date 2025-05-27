import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { setid: string } }
) {
  const setid = params.setid;

  if (!setid) {
    return NextResponse.json({ error: 'SET ID is required' }, { status: 400 });
  }

  const dailyMedUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.xml`;
  console.log(`[API Route /api/dailymed] Fetching XML from DailyMed: ${dailyMedUrl}`);

  try {
    const response = await fetch(dailyMedUrl, {
      headers: {
        'User-Agent': 'NextJS-CustomFetcher/1.0'
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[API Route /api/dailymed] DailyMed API error for ${setid} (XML): ${response.status} ${response.statusText}. Response body (first 500 chars): ${responseText.substring(0, 500)}`);
      return NextResponse.json(
        { 
          error: `DailyMed API Error (XML): ${response.status} ${response.statusText}`,
          dailyMedErrorBody: responseText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    console.log(`[API Route /api/dailymed] Successfully fetched XML for ${setid}. Length: ${responseText.length}`);
    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });

  } catch (error: any) {
    console.error(`[API Route /api/dailymed] Network or other error fetching XML for ${setid}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch XML from DailyMed for ${setid}: ${error.message}` },
      { status: 500 }
    );
  }
} 