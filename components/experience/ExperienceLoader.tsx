import React from 'react';

export const ExperienceLoader = () => {
  return (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl bg-gray-50/50 backdrop-blur-sm dark:bg-gray-900/50">
      <div className="relative flex flex-col items-center gap-4">
        {/* Holographic Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
          <div className="absolute inset-2 animate-spin rounded-full border-t-2 border-primary"></div>
        </div>
        <div className="animate-pulse text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
          Initialisation Rendu 3D...
        </div>
      </div>
    </div>
  );
};