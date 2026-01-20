import React, { useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { CellValue, Position } from '../types';
import { BOARD_SIZE } from '../constants';

interface BoardProps {
  board: CellValue[][];
  lastMove: Position | null;
  winningLine: Position[] | null;
  onCellClick: (x: number, y: number) => void;
  disabled: boolean;
}

export const Board: React.FC<BoardProps> = ({ board, lastMove, winningLine, onCellClick, disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to center on load (optional but nice)
  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, []);

  // Kiểm tra nhanh ô thắng
  const isWinning = (x: number, y: number) => {
    if (!winningLine) return false;
    return winningLine.some(p => p.x === x && p.y === y);
  };

  // Kích thước cố định cho mỗi ô cờ (px)
  const CELL_SIZE = 36;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-auto bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl relative"
    >
      <div 
        className="grid gap-[1px] bg-slate-700 mx-auto my-4"
        style={{
          // Thay đổi từ minmax(32px, 1fr) sang fixed pixels để layout ổn định
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          width: 'max-content', 
          padding: '1px'
        }}
      >
        {board.map((row, y) => (
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              x={x}
              y={y}
              value={cell}
              isLastMove={lastMove?.x === x && lastMove?.y === y}
              isWinningCell={isWinning(x, y)}
              onClick={() => onCellClick(x, y)}
              disabled={disabled || cell !== null}
            />
          ))
        ))}
      </div>
    </div>
  );
};