import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the LogEntry interface (can be shared with client-side if moved to a types file)
interface LogEntry {
  timestamp: string;
  type: 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  optionalParams: any[];
}

// Function to format date and time for filename
function getFormattedDateTime() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0'); // Add seconds
  return `${month}-${day}_${hours}-${minutes}-${seconds}`; // Include seconds in filename
}

const LOG_DIRECTORY = path.join(process.cwd(), 'logs');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logs } = body;

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json({ message: 'Invalid log data. Expected an array of logs.' }, { status: 400 });
    }

    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIRECTORY)) {
      await fs.promises.mkdir(LOG_DIRECTORY, { recursive: true });
    }

    const currentLogFileName = `${getFormattedDateTime()}.log`;
    const logFilePath = path.join(LOG_DIRECTORY, currentLogFileName);

    const logStrings = (logs as LogEntry[]).map(logEntry => {
      const paramsString = logEntry.optionalParams && logEntry.optionalParams.length > 0
        ? logEntry.optionalParams.map(p => typeof p === 'object' ? JSON.stringify(p) : p).join(' ')
        : '';
      return `[${logEntry.timestamp}] [${logEntry.type}] ${logEntry.message} ${paramsString}`;
    });

    const logData = logStrings.join('\n') + '\n';

    // Asynchronously append to the file (or create if it doesn't exist)
    await fs.promises.appendFile(logFilePath, logData);
    
    console.log(`[API/LOG] Received and saved ${logs.length} log entries to ${logFilePath}`);
    return NextResponse.json({ message: 'Logs received successfully.' }, { status: 200 });

  } catch (error) {
    console.error('[API/LOG] Error processing log request:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Failed to process logs.', error: errorMessage }, { status: 500 });
  }
} 