'use client';

import { useGlobalLogSender } from '@/lib/hooks/useGlobalLogSender';

export function GlobalEffects() {
  useGlobalLogSender();
  return null; // This component doesn't render anything visible
} 