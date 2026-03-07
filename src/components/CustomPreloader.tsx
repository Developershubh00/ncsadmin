import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  onLoadingComplete: () => void;
  logoUrl?: string;
}

const CustomPreloader: React.FC<PreloaderProps> = ({ 
  onLoadingComplete,
  logoUrl = "/logo system tek.png"
}) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + 3;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 90); // 90ms * 33 steps ~= 3 seconds

    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      onLoadingComplete();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="mb-8">
        <img 
          src={logoUrl}
          alt="NurseCall Logo" 
          className="h-48 w-auto object-contain rounded-lg shadow-md"
        />
      </div>
      
      <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="mt-6 text-gray-700 font-medium">Your NCS is Loading...</p>
    </div>
  );
};

export default CustomPreloader;