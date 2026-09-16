import React from 'react';
import { COMPANY_INFO } from '../data/mockData';

interface CompanyBrandHeaderProps {
  className?: string;
  showContactInfo?: boolean;
  variant?: 'dark' | 'light' | 'print';
}

export const ChanganLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Silver/Blue Chrome Ring */}
    <circle cx="50" cy="50" r="46" stroke="#1d4ed8" strokeWidth="6" fill="#0f172a" />
    <circle cx="50" cy="50" r="42" stroke="#38bdf8" strokeWidth="2" opacity="0.8" />
    
    {/* Inner Winged V-shape Crest for Changan */}
    <path
      d="M30 36C30 36 40 68 50 78C60 68 70 36 70 36C65 48 56 62 50 68C44 62 35 48 30 36Z"
      fill="url(#changanGradient)"
    />
    <path
      d="M24 38C24 38 38 74 50 86C62 74 76 38 76 38C70 54 59 72 50 80C41 72 30 54 24 38Z"
      fill="#0284c7"
      opacity="0.9"
    />
    <defs>
      <linearGradient id="changanGradient" x1="50" y1="30" x2="50" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.6" stopColor="#0284c7" />
        <stop offset="1" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
  </svg>
);

export const CompanyBrandHeader: React.FC<CompanyBrandHeaderProps> = ({
  className = '',
  showContactInfo = true,
  variant = 'dark',
}) => {
  const isLight = variant === 'light' || variant === 'print';

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-4 border-b ${
        isLight ? 'border-slate-800 pb-4 text-slate-900' : 'border-slate-800/80 pb-4 text-white'
      } ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2
            className={`font-black text-sm sm:text-base tracking-tight uppercase font-sans ${
              isLight ? 'text-black' : 'text-white'
            }`}
          >
            {COMPANY_INFO.name}
          </h2>
        </div>

        {showContactInfo && (
          <div
            className={`text-[11px] sm:text-xs leading-relaxed font-mono ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            <div>
              <strong className={isLight ? 'text-slate-900' : 'text-slate-300'}>RUC:</strong>{' '}
              {COMPANY_INFO.ruc}
            </div>
            <div>
              <strong className={isLight ? 'text-slate-900' : 'text-slate-300'}>DIRECCIÓN:</strong>{' '}
              {COMPANY_INFO.address}
            </div>
            <div>
              <strong className={isLight ? 'text-slate-900' : 'text-slate-300'}>TELFS:</strong>{' '}
              {COMPANY_INFO.phones}
            </div>
          </div>
        )}
      </div>

      {/* Official Changan Auto Logo Badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <ChanganLogoSvg className="w-9 h-9 sm:w-11 sm:h-11" />
        <div className="text-right">
          <div
            className={`font-black text-base sm:text-lg tracking-wider font-sans uppercase ${
              isLight ? 'text-[#004b99]' : 'text-cyan-400'
            }`}
          >
            CHANGAN AUTO
          </div>
          <div
            className={`text-[9px] font-mono tracking-widest uppercase font-bold ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            PANAMÁ • CEDIS CENTRAL
          </div>
        </div>
      </div>
    </div>
  );
};
