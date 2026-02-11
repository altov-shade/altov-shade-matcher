import React from 'react';
import { FoundationShade } from '../types';

interface ShadeCardProps {
  shade: FoundationShade;
  isPrimary?: boolean;
}

const ShadeCard: React.FC<ShadeCardProps> = ({ shade, isPrimary = false }) => {
  return (
    <div
      className={`relative flex flex-col items-center p-8 bg-white rounded-[2.5rem] transition-all duration-700 shadow-xl border ${
        isPrimary
          ? 'border-[#8B5E3C] ring-4 ring-[#8B5E3C]/10 scale-110 md:scale-125 z-20'
          : 'border-gray-50 opacity-60 hover:opacity-100'
      }`}
    >
      {isPrimary && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#8B5E3C] text-white text-[10px] font-black py-2 px-6 rounded-full uppercase tracking-[0.2em] whitespace-nowrap shadow-xl">
          BEST MATCH
        </div>
      )}

      <div
        className={`relative ${isPrimary ? 'w-48 h-72' : 'w-32 h-48'} mb-6 transition-all duration-700`}
      >
        <img
          src={shade.imageUrl}
          alt={`Altov Hydrating Foundation ${shade.code}`}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="text-center w-full">
        <h3
          className={`${isPrimary ? 'text-5xl' : 'text-2xl'} font-black text-black mb-2 tracking-tighter`}
        >
          {shade.code}
        </h3>

        {isPrimary && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <span className="text-[10px] text-[#8B5E3C] font-black tracking-[0.25em] uppercase">
              Precision Identified
            </span>
            <div className="flex gap-1.5">
              <span className="text-[9px] bg-[#FFF9F5] text-[#8B5E3C] px-3 py-1 rounded-full border border-[#F5E6DA] font-black uppercase">
                {shade.depth}
              </span>
              <span className="text-[9px] bg-[#FFF9F5] text-[#8B5E3C] px-3 py-1 rounded-full border border-[#F5E6DA] font-black uppercase">
                {shade.undertone}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShadeCard;
