'use client';

import React from 'react';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  // Add any other specific props your button might need
}

export function CustomButton({ label, variant = 'default', className, ...props }: CustomButtonProps) {
  // Basic styling - you can expand this with Tailwind or CSS Modules
  const baseStyle = "px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-75";
  const variantStyles = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
    ghost: "hover:bg-gray-100 focus:ring-gray-400",
    link: "text-blue-600 hover:underline focus:ring-blue-500",
  };

  const disabledStyle = props.disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${disabledStyle} ${className || ''}`}
      {...props}
    >
      {label}
    </button>
  );
} 