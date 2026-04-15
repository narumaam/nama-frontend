'use client';

import React from 'react';

interface BentoCardProps {
  type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
}

export const BentoCard = ({ type, title, description, price, currency }: BentoCardProps) => {
  const typeIcons: Record<string, string> = {
    HOTEL: '🏨',
    FLIGHT: '✈️',
    TRANSFER: '🚗',
    ACTIVITY: '🏛️',
    MEAL: '🍽️'
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-accent/20 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
          {typeIcons[type] || '📍'}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{type}</div>
          <div className="text-lg font-bold text-primary">{currency} {price.toLocaleString()}</div>
        </div>
      </div>
      <h4 className="text-lg font-bold text-slate-800 mb-2">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
        {description}
      </p>
      <div className="mt-6 flex justify-end">
        <button className="text-xs font-bold text-slate-400 hover:text-accent uppercase tracking-widest flex items-center group/btn">
          View Details <span className="ml-1 group-hover/btn:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};
