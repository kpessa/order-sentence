import React from 'react';
import { Geist, Geist_Mono } from "next/font/google"; // Reverted to original font import
import "./globals.css";
import { StoreProvider } from '@/lib/store/StoreProvider'; // Adjusted path
// import { useGlobalLogSender } from '@/lib/hooks/useGlobalLogSender'; // No longer directly used here
import { GlobalEffects } from '@/components/utility/GlobalEffects'; // Import from new location

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Added display: swap for better font loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap', // Added display: swap for better font loading
});

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// Client component to initialize global effects like the log sender
// function GlobalEffects() {  // Moved to its own file
//   'use client';
//   useGlobalLogSender();
//   return null; 
// }

export const metadata = {
  title: "Drug Information Workflow", // Updated title
  description: "Application for analyzing drug information", // Updated description
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <StoreProvider>
          <GlobalEffects />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
} 