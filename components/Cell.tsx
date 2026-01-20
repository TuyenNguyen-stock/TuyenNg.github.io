import React from 'react';
import { CellValue, Player } from '../types';
import { COLORS } from '../constants';

interface CellProps {
  value: CellValue;
  x: number;
  y: number;
  isLastMove: boolean;
  isWinningCell: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const Cell: React.FC<CellProps> = React.memo(({ value, isLastMove, isWinningCell, onClick, disabled }) => {
  
  let content = null;
  let textColor = '';

  if (value === 'X') {
    content = <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"></path></svg>;
    textColor = COLORS.X;
  } else if (value === 'O') {
    content = <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle></svg>;
    textColor = COLORS.O;
  }

  let bgClass = "bg-slate-800 hover:bg-slate-700";
  if (isWinningCell) bgClass = "bg-green-500/30 ring-2 ring-green-500 animate-pulse";
  else if (isLastMove) bgClass = "bg-slate-700 ring-2 ring-yellow-400";

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`
        w-full h-full aspect-square border border-slate-700 
        flex items-center justify-center cursor-pointer 
        transition-all duration-150 
        ${bgClass} ${textColor}
        ${disabled ? 'cursor-default' : ''}
      `}
    >
      {content}
    </div>
  );
});
