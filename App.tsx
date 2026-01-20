import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Board } from './components/Board';
import { OnlineMenu } from './components/OnlineMenu';
import { RockPaperScissors } from './components/RockPaperScissors';
import { AvatarSelector } from './components/AvatarSelector';
import { AvatarDisplay } from './components/AvatarDisplay';
import { createEmptyBoard, checkWin, getBestMove } from './services/gameLogic';
import { GameMode, GameState, OnlineState, Player, Position, RPSMove } from './types';

// Declare PeerJS globally (loaded via CDN)
declare const Peer: any;

type StartOption = 'YOU' | 'AI' | 'RANDOM';

function App() {
  // --- UI State ---
  const [localName, setLocalName] = useState('Bạn');
  const [localAvatar, setLocalAvatar] = useState('😎'); // Default avatar
  const [copySuccess, setCopySuccess] = useState(false); // Trạng thái copy link

  // --- Game State ---
  const [mode, setMode] = useState<GameMode | null>(null);
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [myPlayerSide, setMyPlayerSide] = useState<Player>('X'); 
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  const [winningLine, setWinningLine] = useState<Position[] | null>(null);
  const [history, setHistory] = useState<Position[]>([]);
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [pveStartOption, setPveStartOption] = useState<StartOption | null>(null);

  // --- Refs for State Access inside Event Listeners ---
  const boardRef = useRef(board);
  const winnerRef = useRef(winner);
  const currentPlayerRef = useRef(currentPlayer);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

  // --- Online State ---
  const [onlineState, setOnlineState] = useState<OnlineState>({
    isHost: false,
    peerId: null,
    conn: null,
    status: 'DISCONNECTED',
    myName: 'Bạn',
    myAvatar: '😎',
    opponentName: 'Đối thủ',
    opponentAvatar: '👤'
  });
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // --- RPS State ---
  const [rpsMyMove, setRpsMyMove] = useState<RPSMove>(null);
  const [rpsOpponentMove, setRpsOpponentMove] = useState<RPSMove>(null);
  const [rpsResult, setRpsResult] = useState<string | null>(null);

  // --- Reset Request State ---
  const [resetRequestFromOpponent, setResetRequestFromOpponent] = useState(false);
  const [waitingForResetResponse, setWaitingForResetResponse] = useState(false);

  // --- Auto Detect Invite Link ---
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      // Nếu có room ID trên URL, tự động chuyển sang chế độ Online
      if (roomParam && !mode) {
          setMode('PVP_ONLINE');
      }
  }, []); // Chỉ chạy 1 lần khi load

  // --- Game Logic Actions ---

  const startGamePVE = (startWho: StartOption) => {
    setMode('PVE');
    setPveStartOption(null);
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningLine(null);
    setHistory([]);
    setScore({ X: 0, O: 0 }); // Reset điểm
    setIsAiThinking(false);
    // Setup AI avatar
    setOnlineState(prev => ({ 
        ...prev, 
        myName: localName, 
        myAvatar: localAvatar,
        opponentName: 'AI Bot',
        opponentAvatar: '🤖'
    }));

    let firstPlayer: Player = 'X';
    let userSide: Player = 'X';

    if (startWho === 'YOU') {
        firstPlayer = 'X'; userSide = 'X';
    } else if (startWho === 'AI') {
        firstPlayer = 'X'; userSide = 'O';
    } else {
        if (Math.random() > 0.5) { firstPlayer = 'X'; userSide = 'X'; }
        else { firstPlayer = 'X'; userSide = 'O'; }
    }

    setCurrentPlayer(firstPlayer);
    setMyPlayerSide(userSide);
  };

  const startGameLocal = (name: string, avatar: string) => {
     setOnlineState(prev => ({
         ...prev, 
         myName: name || 'Người 1', 
         myAvatar: avatar,
         opponentName: 'Người 2',
         opponentAvatar: '👤'
    }));
     setScore({ X: 0, O: 0 });
     setMode('PVP_LOCAL');
     resetGame();
  }

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningLine(null);
    setHistory([]);
    setCurrentPlayer('X'); 
    setIsAiThinking(false);
    setResetRequestFromOpponent(false);
    setWaitingForResetResponse(false);
  }, []);

  const processMove = (x: number, y: number, player: Player) => {
    setBoard(prev => {
        const newBoard = prev.map(row => [...row]);
        newBoard[y][x] = player;
        const wLine = checkWin(newBoard, x, y, player);
        if (wLine) {
            setWinner(player);
            setWinningLine(wLine);
            setScore(s => ({ ...s, [player]: s[player] + 1 }));
        } else if (newBoard.every(row => row.every(c => c !== null))) {
            setWinner('DRAW');
        } else {
            setCurrentPlayer(p => p === 'X' ? 'O' : 'X');
        }
        return newBoard;
    });
    setHistory(prev => [...prev, { x, y }]);
  };

  const onCellClick = (x: number, y: number) => {
    if (winner || board[y][x] || isAiThinking || waitingForResetResponse || resetRequestFromOpponent) return;

    if (mode === 'PVP_ONLINE') {
      if (currentPlayer !== myPlayerSide) return;
      if (connRef.current && connRef.current.open) {
        connRef.current.send({ type: 'MOVE', x, y, player: myPlayerSide });
        processMove(x, y, myPlayerSide);
      }
    } else if (mode === 'PVE') {
        if (currentPlayer !== myPlayerSide) return;
        processMove(x, y, currentPlayer);
    } else {
        processMove(x, y, currentPlayer);
    }
  };

  const undoMove = () => {
    if (history.length === 0 || winner || mode === 'PVP_ONLINE' || waitingForResetResponse) return;
    const steps = mode === 'PVE' ? 2 : 1;
    if (history.length < steps) { resetGame(); return; }

    const newHistory = history.slice(0, history.length - steps);
    setHistory(newHistory);
    
    setBoard(prev => {
        const nb = prev.map(r => [...r]);
        history.slice(history.length - steps).forEach(p => nb[p.y][p.x] = null);
        return nb;
    });
    
    if (mode === 'PVE') setCurrentPlayer(myPlayerSide); 
    else setCurrentPlayer(p => p === 'X' ? 'O' : 'X');
    
    setWinner(null);
    setWinningLine(null);
  };

  const requestOnlineReset = () => {
      if (mode !== 'PVP_ONLINE' || !connRef.current) {
          resetGame();
          return;
      }
      setWaitingForResetResponse(true);
      connRef.current.send({ type: 'RESET_REQUEST' });
  }

  const respondToReset = (accept: boolean) => {
      setResetRequestFromOpponent(false);
      if (accept) {
          resetGame();
          connRef.current.send({ type: 'RESET_RESPONSE', accept: true });
      } else {
          connRef.current.send({ type: 'RESET_RESPONSE', accept: false });
      }
  }

  useEffect(() => {
    if (mode === 'PVE' && currentPlayer !== myPlayerSide && !winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const aiSide = myPlayerSide === 'X' ? 'O' : 'X';
        const move = getBestMove(board, aiSide);
        processMove(move.x, move.y, aiSide);
        setIsAiThinking(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, mode, winner, board, myPlayerSide]);

  // --- ONLINE LOGIC & RPS ---
  const handleRPSSelect = (move: RPSMove) => {
      setRpsMyMove(move);
      if (connRef.current) {
          connRef.current.send({ type: 'RPS_MOVE', move });
      }
      checkRPSResult(move, rpsOpponentMove);
  }

  const checkRPSResult = (my: RPSMove, opp: RPSMove) => {
      if (!my || !opp) return;
      let iWin = false, draw = false;
      if (my === opp) draw = true;
      else if (
          (my === 'ROCK' && opp === 'SCISSORS') ||
          (my === 'PAPER' && opp === 'ROCK') ||
          (my === 'SCISSORS' && opp === 'PAPER')
      ) iWin = true;

      if (draw) {
          setRpsResult("Hòa! Đấu lại...");
          setTimeout(() => {
              setRpsMyMove(null);
              setRpsOpponentMove(null);
              setRpsResult(null);
          }, 2000);
      } else {
          setRpsResult(iWin ? "Bạn thắng! Bạn đi trước (X)" : `${onlineState.opponentName} thắng! Họ đi trước (X)`);
          setTimeout(() => {
              setOnlineState(prev => ({ ...prev, status: 'CONNECTED' }));
              setMyPlayerSide(iWin ? 'X' : 'O');
              setCurrentPlayer('X'); 
              resetGame();
          }, 2500);
      }
  }

  const initPeer = (currentName: string, currentAvatar: string) => {
    if (peerRef.current && !peerRef.current.destroyed) return peerRef.current;
    const peer = new Peer(null, { 
        debug: 1,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] }
    });
    peerRef.current = peer;

    peer.on('open', (id: string) => {
      setOnlineState(prev => ({ ...prev, peerId: id }));
    });
    peer.on('connection', (conn: any) => handleConnection(conn, currentName, currentAvatar));
    peer.on('error', (err: any) => {
      setOnlineError("Lỗi kết nối: " + err.type);
      setOnlineState(prev => ({ ...prev, status: 'ERROR' }));
    });
    return peer;
  };

  const handleConnection = (conn: any, myName: string, myAvatar: string) => {
    connRef.current = conn;
    const sendHello = () => conn.send({ type: 'HELLO', name: myName, avatar: myAvatar });
    if (conn.open) sendHello();
    else conn.on('open', sendHello);

    conn.on('data', (data: any) => {
      if (data.type === 'HELLO') {
           setOnlineState(prev => ({ 
               ...prev, 
               status: 'RPS_BATTLE', 
               conn, 
               opponentName: data.name || 'Đối thủ',
               opponentAvatar: data.avatar || '👤'
           }));
           setScore({ X: 0, O: 0 });
           setOnlineError(null);
           setRpsMyMove(null);
           setRpsOpponentMove(null);
           setRpsResult(null);
           
           // Clear URL param after successful connection to clean up address bar
            try {
                if (window.history.pushState) {
                    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.pushState({path:newUrl},'',newUrl);
                }
            } catch (e) {
                console.warn("Could not update history URL:", e);
            }
      }
      else if (data.type === 'RPS_MOVE') setRpsOpponentMove(data.move);
      else if (data.type === 'MOVE') {
          if (winnerRef.current) return;
          processMove(data.x, data.y, data.player);
      }
      else if (data.type === 'RESET_REQUEST') setResetRequestFromOpponent(true);
      else if (data.type === 'RESET_RESPONSE') {
          setWaitingForResetResponse(false);
          if (data.accept) resetGame();
          else alert('Đối thủ đã từ chối làm mới ván cờ.');
      }
    });

    conn.on('close', () => {
      alert('Đối thủ đã thoát!');
      setOnlineState(prev => ({ ...prev, status: 'DISCONNECTED', conn: null }));
      setMode(null);
    });
  };
  
  useEffect(() => {
      if (onlineState.status === 'RPS_BATTLE' && rpsMyMove && rpsOpponentMove && !rpsResult) {
          checkRPSResult(rpsMyMove, rpsOpponentMove);
      }
  }, [rpsMyMove, rpsOpponentMove, onlineState.status, rpsResult]);

  const createRoom = (name: string, avatar: string) => {
    if (peerRef.current) peerRef.current.destroy();
    setOnlineError(null);
    setOnlineState(prev => ({ ...prev, isHost: true, status: 'CONNECTING', peerId: null, myName: name, myAvatar: avatar }));
    initPeer(name, avatar);
  };

  const joinRoom = (hostId: string, name: string, avatar: string) => {
    const cleanId = hostId.trim();
    if (!cleanId) return;
    setOnlineError(null);
    setOnlineState(prev => ({ ...prev, isHost: false, status: 'CONNECTING', myName: name, myAvatar: avatar }));
    
    const peer = initPeer(name, avatar);
    const tryConnect = () => {
        if (!peer.open || !peer.id) { setTimeout(tryConnect, 200); return; }
        const conn = peer.connect(cleanId, { reliable: true, serialization: 'json' });
        handleConnection(conn, name, avatar);
        setTimeout(() => {
             if (connRef.current && !connRef.current.open) setOnlineError("Kết nối quá lâu. Thử lại.");
        }, 8000);
    };
    tryConnect();
  };
  
  const destroyPeer = () => {
      if (connRef.current) { connRef.current.close(); connRef.current = null; }
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
      setOnlineState(prev => ({...prev, isHost: false, peerId: null, status: 'DISCONNECTED'}));
  };

  const copyInviteLink = () => {
      if (!onlineState.peerId) return;
      // Tạo link mời: Base URL + ?room=PEER_ID
      const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${onlineState.peerId}`;
      navigator.clipboard.writeText(url).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
      });
  };

  const getPlayerInfo = (side: Player) => {
      if (mode === 'PVE') return myPlayerSide === side ? { name: localName, avatar: localAvatar } : { name: 'AI Bot', avatar: '🤖' };
      if (mode === 'PVP_ONLINE') return myPlayerSide === side ? { name: onlineState.myName, avatar: onlineState.myAvatar } : { name: onlineState.opponentName, avatar: onlineState.opponentAvatar };
      return side === 'X' ? { name: onlineState.myName, avatar: onlineState.myAvatar } : { name: onlineState.opponentName, avatar: '👤' };
  }

  // 1. Menu Selection
  if (!mode && !pveStartOption) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">CARO AI PRO</h1>
          <p className="text-slate-400 mb-6">Thách thức trí tuệ đỉnh cao</p>
          <div className="mb-6 flex flex-col gap-2 items-center">
             <label className="text-xs text-slate-500 w-full text-left ml-1">Chọn Avatar & Tên:</label>
             <AvatarSelector selectedAvatar={localAvatar} onSelect={setLocalAvatar} />
             <input type="text" value={localName} onChange={(e) => setLocalName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold" maxLength={10} />
          </div>
          <div className="space-y-4">
            <button onClick={() => { setOnlineState(s => ({...s, myName: localName, myAvatar: localAvatar})); setPveStartOption('YOU'); }} className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"><span>🤖</span> Đấu với AI</button>
            <button onClick={() => startGameLocal(localName, localAvatar)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-green-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"><span>👥</span> 2 Người (Local)</button>
            <button onClick={() => { destroyPeer(); setMode('PVP_ONLINE'); }} className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"><span>🌐</span> Chơi Online (P2P)</button>
          </div>
          <div className="mt-8 text-xs text-slate-600">v3.1.0 - Magic Link</div>
        </div>
      </div>
    );
  }

  // 2. PVE Start
  if (pveStartOption) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
             <h2 className="text-2xl font-bold mb-4">Ai đi trước?</h2>
             <div className="space-y-3">
                 <button onClick={() => startGamePVE('YOU')} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">Bạn đi trước (X)</button>
                 <button onClick={() => startGamePVE('AI')} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold">AI đi trước (O)</button>
                 <button onClick={() => startGamePVE('RANDOM')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold">Ngẫu nhiên</button>
             </div>
             <button onClick={() => setPveStartOption(null)} className="mt-4 text-slate-400 hover:text-white underline">Quay lại</button>
          </div>
        </div>
      );
  }

  // 3. Online
  if (mode === 'PVP_ONLINE' && onlineState.status !== 'CONNECTED' && onlineState.status !== 'RPS_BATTLE') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
             <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center">
                 <h2 className="text-2xl font-bold mb-6">Kết nối Online</h2>
                 {onlineState.isHost && (
                     <div className="text-center w-full animate-fade-in">
                         <p className="text-slate-400 mb-2">Gửi ID này cho bạn bè:</p>
                         {onlineState.peerId ? (
                            <div className="flex flex-col gap-3">
                                <div className="bg-slate-950 p-4 rounded border border-slate-700 font-mono text-xl select-all text-yellow-400 break-all">{onlineState.peerId}</div>
                                <button onClick={copyInviteLink} className={`px-4 py-2 rounded font-bold transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                    {copySuccess ? 'Đã copy link!' : '📋 Sao chép Link Mời'}
                                </button>
                            </div>
                         ) : <div className="loader mx-auto mb-4"></div>}
                         <div className="flex items-center justify-center gap-2 text-slate-500 my-6"><div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>Đang chờ đối thủ...</div>
                         <div className="border-t border-slate-700 pt-4">
                             <p className="text-xs text-slate-500 mb-2">Bạn của bạn đã tạo phòng rồi?</p>
                             <button onClick={() => destroyPeer()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600 font-bold transition-colors text-sm">Hủy Host & Nhập mã</button>
                         </div>
                     </div>
                 )}
                 {!onlineState.isHost && (
                    <div className="w-full">
                        {onlineState.status === 'CONNECTING' ? (
                           <div className="text-center"><div className="text-slate-400 mb-2">Đang kết nối tới máy chủ...</div></div>
                        ) : (
                           <OnlineMenu onCreate={createRoom} onJoin={joinRoom} onBack={() => { destroyPeer(); setMode(null); }} isConnecting={false} error={onlineError} initialName={localName} initialAvatar={localAvatar} />
                        )}
                    </div>
                 )}
                 <button onClick={() => { destroyPeer(); setMode(null); }} className="mt-6 text-slate-500 hover:text-white underline">Huỷ bỏ</button>
             </div>
        </div>
    )
  }

  // 4. Game Board
  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col md:flex-row overflow-hidden relative">
      {onlineState.status === 'RPS_BATTLE' && <RockPaperScissors myMove={rpsMyMove} opponentMove={rpsOpponentMove} onSelect={handleRPSSelect} resultMessage={rpsResult} opponentName={onlineState.opponentName} />}
      {resetRequestFromOpponent && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl max-w-sm w-full text-center animate-bounce-in">
                  <h3 className="text-xl font-bold mb-4 text-white">Yêu cầu ván mới</h3>
                  <p className="text-slate-300 mb-6">{onlineState.opponentName} muốn chơi ván mới. Bạn có đồng ý?</p>
                  <div className="flex gap-3"><button onClick={() => respondToReset(true)} className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded font-bold">Đồng ý</button><button onClick={() => respondToReset(false)} className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 rounded font-bold">Từ chối</button></div>
              </div>
          </div>
      )}
      {waitingForResetResponse && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"><div className="text-white font-bold flex flex-col items-center"><div className="loader mb-4"></div>Đang chờ {onlineState.opponentName} xác nhận...</div></div> )}

      <div className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col z-10 shadow-xl">
        <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => { destroyPeer(); setMode(null); }}>
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">C</div><span className="font-bold text-lg">Caro Pro</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
            {['X', 'O'].map((side) => {
                const info = getPlayerInfo(side as Player);
                return (
                    <div key={side} className={`p-3 rounded-lg border flex flex-col items-center transition-all ${currentPlayer === side ? (side==='X'?'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10':'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/10') : 'bg-slate-800 border-slate-700'}`}>
                        <span className={`${side==='X'?'text-blue-400':'text-red-400'} font-bold text-xl`}>{side}</span>
                        <AvatarDisplay avatar={info.avatar} />
                        <span className="text-xs text-slate-400 mb-1 truncate w-full text-center px-1 font-bold">{info.name}</span>
                        <span className="text-2xl font-black">{score[side as Player]}</span>
                    </div>
                )
            })}
        </div>
        <div className="mb-6 text-center h-12 flex items-center justify-center">
            {winner ? (
                <div className="py-2 px-4 bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/50 font-bold animate-pulse">{winner === 'DRAW' ? 'Hòa!' : `🏆 ${getPlayerInfo(winner).name} Thắng!`}</div>
            ) : ( <div className="text-slate-300 flex items-center justify-center gap-2">{isAiThinking ? <>🤖 AI đang tính toán...</> : <>Lượt của: <span className={`font-bold ${currentPlayer === 'X' ? 'text-blue-400' : 'text-red-400'}`}>{currentPlayer === 'X' ? 'X' : 'O'}</span></>}</div> )}
        </div>
        <div className="mt-auto space-y-3">
             <button onClick={undoMove} disabled={mode === 'PVP_ONLINE' || !!winner || history.length === 0} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">↩️ Đi lại</button>
            <button onClick={() => { 
                if (mode === 'PVP_ONLINE') requestOnlineReset(); 
                else resetGame();
            }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors shadow-lg shadow-indigo-500/20">🔄 Ván mới</button>
            <button onClick={() => { destroyPeer(); setMode(null); }} className="w-full py-3 bg-slate-800 text-red-400 hover:bg-slate-700 rounded-lg font-semibold transition-colors">Thoát</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative">
        <Board board={board} lastMove={history[history.length - 1] || null} winningLine={winningLine} onCellClick={onCellClick} disabled={!!winner || isAiThinking || (mode === 'PVP_ONLINE' && ((myPlayerSide !== currentPlayer))) || onlineState.status === 'RPS_BATTLE'} />
        {!winner && !isAiThinking && history.length === 0 && onlineState.status !== 'RPS_BATTLE' && <div className="absolute top-8 bg-slate-800/90 text-white px-6 py-2 rounded-full border border-slate-600 shadow-lg animate-bounce">{currentPlayer === myPlayerSide ? "Bạn đi trước!" : `${onlineState.opponentName} đi trước!`}</div>}
      </div>
    </div>
  );
}

export default App;