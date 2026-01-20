import React from 'react';
import { RPSMove } from '../types';

interface RPSProps {
  myMove: RPSMove;
  opponentMove: RPSMove;
  onSelect: (move: RPSMove) => void;
  resultMessage: string | null;
  opponentName: string;
}

export const RockPaperScissors: React.FC<RPSProps> = ({ myMove, opponentMove, onSelect, resultMessage, opponentName }) => {
  const moves: { id: RPSMove; icon: string; label: string }[] = [
    { id: 'ROCK', icon: '✊', label: 'Búa' },
    { id: 'PAPER', icon: '✋', label: 'Bao' },
    { id: 'SCISSORS', icon: '✌️', label: 'Kéo' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            OẲN TÙ TÌ
        </h2>
        <p className="text-slate-400 mb-6 text-center text-sm">Người thắng sẽ được đi trước (X)</p>

        {/* Game Area */}
        <div className="flex justify-between w-full mb-8 px-4">
            <div className="flex flex-col items-center">
                <span className="text-blue-400 font-bold mb-2">Bạn</span>
                <div className={`w-20 h-20 flex items-center justify-center text-4xl bg-slate-800 rounded-full border-4 ${myMove ? 'border-blue-500' : 'border-slate-700 border-dashed'}`}>
                    {myMove ? moves.find(m => m.id === myMove)?.icon : '?'}
                </div>
            </div>
            
            <div className="flex items-center justify-center font-bold text-2xl text-slate-600">VS</div>

            <div className="flex flex-col items-center">
                <span className="text-red-400 font-bold mb-2">{opponentName}</span>
                <div className={`w-20 h-20 flex items-center justify-center text-4xl bg-slate-800 rounded-full border-4 ${opponentMove ? 'border-red-500' : 'border-slate-700 border-dashed'}`}>
                     {/* Ẩn nước đi của đối thủ cho đến khi có kết quả hoặc khi mình chưa chọn */}
                     {(opponentMove && myMove && resultMessage) ? moves.find(m => m.id === opponentMove)?.icon : (opponentMove ? '✔️' : '?')}
                </div>
            </div>
        </div>

        {/* Status / Result */}
        <div className="h-12 flex items-center justify-center mb-6 w-full">
            {resultMessage ? (
                <div className="text-xl font-bold text-yellow-300 animate-bounce">{resultMessage}</div>
            ) : (
                <div className="text-slate-400 animate-pulse">{!myMove ? "Hãy chọn nước đi..." : (!opponentMove ? `Đang chờ ${opponentName}...` : "Đang so kết quả...")}</div>
            )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 w-full justify-center">
            {moves.map((m) => (
                <button
                    key={m.id}
                    onClick={() => !myMove && onSelect(m.id as RPSMove)}
                    disabled={!!myMove}
                    className={`
                        flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 transition-all
                        ${myMove === m.id 
                            ? 'bg-blue-600 border-blue-400 scale-110 shadow-lg shadow-blue-500/50' 
                            : (myMove ? 'bg-slate-800 border-slate-700 opacity-50' : 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-yellow-400 hover:scale-105 active:scale-95')
                        }
                    `}
                >
                    <span className="text-3xl mb-1">{m.icon}</span>
                    <span className="font-bold text-sm">{m.label}</span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
