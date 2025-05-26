// src/lib/utils/logInterceptor.ts

const MAX_LOG_ENTRIES = 200; // Max number of log entries to store in session storage
const LOG_STORAGE_KEY = 'appSessionLogs';

interface LogEntry {
  timestamp: string;
  type: 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  optionalParams: any[];
}

let originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

let isInterceptorActive = false;

function getCallSite(stack: string): string {
  if (!stack) return ' <unknown_site>';
  const lines = stack.split('\n');
  // Try to find the first line that doesn't seem to be part of the logger itself or an anonymous function
  // This is heuristic and might need adjustment.
  // Line 0: Error
  // Line 1: at getCallSite (...
  // Line 2: at addLogEntry (...
  // Line 3: at console.log (...
  // Line 4: usually the actual call site
  let callSiteLine = lines[4] || lines[3] || lines[lines.length -1]; // Fallback to deeper or last line
  
  if (callSiteLine) {
    // Example line: "    at Module.functionName (http://localhost:3000/path/to/file.js:123:45)"
    // Or: "    at http://localhost:3000/path/to/file.js:123:45"
    const match = callSiteLine.match(/\((.*):(\d+):(\d+)\)$/) || callSiteLine.match(/at (.*):(\d+):(\d+)$/);
    if (match) {
      const filePath = match[1];
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      return ` ${fileName}:${match[2]}`;
    }
    // Simpler extraction if no parenthesis (e.g. Next.js server components or different stack formats)
    const parts = callSiteLine.trim().split(' ').pop(); // Get the last part, which might be path:line:col
    if (parts && parts.includes(':')) {
        const pathParts = parts.split(':');
        const potentialFilePath = pathParts.slice(0, -2).join(':');
        const line = pathParts[pathParts.length -2];
        if (potentialFilePath && line && !isNaN(parseInt(line))) {
            const fileName = potentialFilePath.substring(potentialFilePath.lastIndexOf('/') + 1);
            if (fileName) return ` ${fileName}:${line}`;
            return ` ${potentialFilePath}:${line}`;
        }
    }
    return ` ${callSiteLine.trim()}`;
  }
  return ' <unknown_site>';
}

function getStoredLogs(): LogEntry[] {
  try {
    const stored = sessionStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    originalConsole.error('Error reading logs from session storage:', e);
    return [];
  }
}

function saveLogs(logs: LogEntry[]): void {
  try {
    sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    originalConsole.error('Error saving logs to session storage:', e);
  }
}

function addLogEntry(type: LogEntry['type'], message: string, optionalParams: any[]): void {
  if (typeof window === 'undefined') return; // Don't run on server

  const stack = new Error().stack || '';
  const callSite = getCallSite(stack);

  const logs = getStoredLogs();
  const newEntry: LogEntry = {
    timestamp: new Date().toLocaleString(), // Format: MM/DD/YYYY, HH:MM:SS AM/PM (locale dependent)
    type,
    message: `${callSite} ${message}`,
    optionalParams,
  };

  logs.push(newEntry);
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.splice(0, logs.length - MAX_LOG_ENTRIES); // Keep only the latest entries
  }
  saveLogs(logs);
}

export function initLogInterceptor(): void {
  if (isInterceptorActive || typeof window === 'undefined') {
    return;
  }

  originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  console.log = (message?: any, ...optionalParams: any[]) => {
    const stack = new Error().stack || '';
    const callSite = getCallSite(stack);
    originalConsole.log(`[LOG]${callSite}`, message, ...optionalParams);
    addLogEntry('LOG', typeof message === 'string' ? message : JSON.stringify(message), optionalParams);
  };
  console.info = (message?: any, ...optionalParams: any[]) => {
    const stack = new Error().stack || '';
    const callSite = getCallSite(stack);
    originalConsole.info(`[INFO]${callSite}`, message, ...optionalParams);
    addLogEntry('INFO', typeof message === 'string' ? message : JSON.stringify(message), optionalParams);
  };
  console.warn = (message?: any, ...optionalParams: any[]) => {
    const stack = new Error().stack || '';
    const callSite = getCallSite(stack);
    originalConsole.warn(`[WARN]${callSite}`, message, ...optionalParams);
    addLogEntry('WARN', typeof message === 'string' ? message : JSON.stringify(message), optionalParams);
  };
  console.error = (message?: any, ...optionalParams: any[]) => {
    const stack = new Error().stack || '';
    const callSite = getCallSite(stack);
    originalConsole.error(`[ERROR]${callSite}`, message, ...optionalParams);
    addLogEntry('ERROR', typeof message === 'string' ? message : JSON.stringify(message), optionalParams);
  };
  console.debug = (message?: any, ...optionalParams: any[]) => {
    const stack = new Error().stack || '';
    const callSite = getCallSite(stack);
    originalConsole.debug(`[DEBUG]${callSite}`, message, ...optionalParams);
    addLogEntry('DEBUG', typeof message === 'string' ? message : JSON.stringify(message), optionalParams);
  };

  isInterceptorActive = true;
  originalConsole.info('Log interceptor initialized.');
}

export function getCapturedLogs(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  return getStoredLogs();
}

export function clearCapturedLogs(): void {
  if (typeof window === 'undefined') return;
  saveLogs([]);
  originalConsole.info('Captured logs cleared from session storage.');
} 