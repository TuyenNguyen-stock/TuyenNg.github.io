export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type GameMode = 'PVE' | 'PVP_LOCAL' | 'PVP_ONLINE';
export type RPSMove = 'ROCK' | 'PAPER' | 'SCISSORS' | null;

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  board: CellValue[][];
  currentPlayer: Player;
  winner: Player | 'DRAW' | null;
  winningLine: Position[] | null;
  history: Position[]; // Để tính năng Undo
}

export interface OnlineState {
  isHost: boolean;
  peerId: string | null;
  conn: any | null; // PeerJS connection
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'RPS_BATTLE';
  opponentName: string;
  opponentAvatar: string; // New: Avatar đối thủ
  myName: string;
  myAvatar: string; // New: Avatar của mình
}

// Data packet types
export interface DataPacket {
  type: 'HELLO' | 'RPS_MOVE' | 'MOVE' | 'RESET_REQUEST' | 'RESET_RESPONSE' | 'CHAT';
  payload?: any;
  name?: string; // For HELLO
  avatar?: string; // For HELLO
}
