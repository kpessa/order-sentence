import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  height?: string;
  width?: string;
}

export function SkeletonLoader({ className = '', height = 'h-4', width = 'w-full' }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 bg-white border rounded-lg">
      <div className="animate-pulse">
        <SkeletonLoader className="mb-4" height="h-6" width="w-3/4" />
        <SkeletonLoader className="mb-2" height="h-4" width="w-1/2" />
        <SkeletonLoader className="mb-2" height="h-4" width="w-2/3" />
        <SkeletonLoader height="h-4" width="w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <SkeletonLoader width="w-1/4" />
          <SkeletonLoader width="w-1/3" />
          <SkeletonLoader width="w-1/4" />
          <SkeletonLoader width="w-1/6" />
        </div>
      ))}
    </div>
  );
}