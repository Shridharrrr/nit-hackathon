'use client';

export default function Logo({ className = "h-8 w-8" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#6366F1', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Circle background */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
      
      {/* Water drop/flow shape */}
      <path 
        d="M50 20 C35 35, 35 45, 35 55 C35 65, 42 72, 50 72 C58 72, 65 65, 65 55 C65 45, 65 35, 50 20 Z" 
        fill="white" 
        opacity="0.9"
      />
      
      {/* Checkmark inside the drop */}
      <path 
        d="M43 52 L48 57 L58 42" 
        stroke="url(#logoGradient)" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Flow lines */}
      <path 
        d="M25 30 Q30 28, 35 30" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        opacity="0.6"
      />
      <path 
        d="M70 65 Q75 67, 80 65" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
