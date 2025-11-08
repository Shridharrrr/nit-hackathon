'use client';

export default function Loader({ size = 'medium' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-10 w-10',
    large: 'h-14 w-14',
    xlarge: 'h-20 w-20'
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Outer spinning ring */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-gray-800 animate-spin`}
          style={{
            borderTopColor: '#8b5cf6',
            borderRightColor: '#a78bfa',
            animationDuration: '1s'
          }}
        ></div>
      </div>
    </div>
  );
}
