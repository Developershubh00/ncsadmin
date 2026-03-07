import React from 'react';

interface GenderIconProps {
  gender: 'M' | 'F';
  className?: string;
}

const GenderIcon: React.FC<GenderIconProps> = ({ gender, className = "w-5 h-5" }) => {
  if (gender === 'F') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 13C14.7614 13 17 10.7614 17 8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8C7 10.7614 9.23858 13 12 13ZM12 13V21M9 18H15" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M12 13C14.7614 13 17 10.7614 17 8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8C7 10.7614 9.23858 13 12 13ZM12 13L17 18M17 18H12M17 18V13" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default GenderIcon;