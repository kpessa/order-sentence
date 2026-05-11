import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG, handleApiError } from '@/lib/config/api';

export async function POST(request: NextRequest) {
  try {
    const { content, type = 'clinical', maxLength = 500, question } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!API_CONFIG.ANTHROPIC.API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the prompt based on the type of summary requested
    let prompt: string;
    
    if (type === 'question' && question) {
      prompt = `You are a clinical pharmacist answering specific questions about drug information for healthcare providers.
         
         Question: ${question}
         
         Please provide a detailed, accurate answer based on the following drug information. 
         Include specific numbers, dosages, and relevant clinical details.
         If the information to answer the question is not available in the provided content, clearly state that.
         
         Drug Information:
         ${content}
         
         Answer:`;
    } else if (type === 'clinical') {
      prompt = `You are a clinical pharmacist providing a concise drug summary for healthcare providers.
         
         Please provide a brief, clear summary of the most important clinical information about this drug in ${maxLength} characters or less.
         
         Focus on:
         - Available dosage forms (especially note any extended-release formulations)
         - Most common dosing
         - Key warnings or contraindications
         - Any special considerations
         
         Be concise but include specific details like dosage strengths and frequencies when relevant.
         
         Drug Information:
         ${content}
         
         Summary:`;
    } else {
      prompt = `Summarize the following content concisely in ${maxLength} characters or less:
         
         ${content}
         
         Summary:`;
    }

    // Call Anthropic API
    const response = await fetch(`${API_CONFIG.ANTHROPIC.BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_CONFIG.ANTHROPIC.API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: API_CONFIG.ANTHROPIC.MODEL,
        max_tokens: API_CONFIG.ANTHROPIC.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Very low temperature for consistent, factual medical summaries
      }),
      signal: AbortSignal.timeout(API_CONFIG.ANTHROPIC.TIMEOUT),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate summary', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const summary = data.content[0]?.text || '';

    return NextResponse.json({
      summary,
      model: API_CONFIG.ANTHROPIC.MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const apiError = handleApiError(error, 'Summarize API');
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', ...apiError },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', ...apiError },
      { status: 500 }
    );
  }
}