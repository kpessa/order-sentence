'use client';

import { useEffect, useCallback } from 'react';
import { getCapturedLogs, clearCapturedLogs, initLogInterceptor } from '@/lib/utils/logInterceptor';

const LOG_SERVER_ENDPOINT = '/api/log'; // Updated to use Next.js API route
const HOTKEY = 'l'; // Hotkey: "L"

// Define specific modifier keys required
const REQUIRED_MODIFIERS = { // Booleans to indicate if a key should be pressed
  ctrlKey: true,
  altKey: true,
  shiftKey: false,
  metaKey: false, // For Command key on Mac
};

export function useGlobalLogSender() {
  useEffect(() => {
    // Initialize the log interceptor when this hook is first used (e.g., in RootLayout)
    initLogInterceptor();
  }, []);

  const sendLogsToServer = useCallback(async () => {
    const logs = getCapturedLogs();
    if (logs.length === 0) {
      console.info('No logs to send.');
      return;
    }

    try {
      const response = await fetch(LOG_SERVER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }), // Send logs under a 'logs' key
      });

      if (response.ok) {
        console.info('Logs successfully sent to server.');
        clearCapturedLogs(); // Optionally clear logs after sending
      } else {
        console.error('Failed to send logs:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Server error response:', errorData);
      }
    } catch (error) {
      console.error('Error sending logs:', error);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is our hotkey
      if (event.key.toLowerCase() !== HOTKEY) {
        return;
      }

      // Check if all REQUIRED modifier keys are pressed as specified
      const modifiersMatch = 
        (REQUIRED_MODIFIERS.ctrlKey === event.ctrlKey) &&
        (REQUIRED_MODIFIERS.altKey === event.altKey) &&
        (REQUIRED_MODIFIERS.shiftKey === event.shiftKey) &&
        (REQUIRED_MODIFIERS.metaKey === event.metaKey);

      if (modifiersMatch) {
        event.preventDefault();
        console.log('Log export hotkey (Ctrl+Alt+L) pressed!');
        sendLogsToServer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sendLogsToServer]);

  // You can return functions or states if needed, but for now, it just sets up the listener
  return {}; 
} 