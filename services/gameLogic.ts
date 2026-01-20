import { BOARD_SIZE, WIN_CONDITION } from '../constants';
import { CellValue, Player, Position } from '../types';

export const createEmptyBoard = (): CellValue[][] => {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
};

// Kiểm tra thắng
export const checkWin = (board: CellValue[][], x: number, y: number, player: Player): Position[] | null => {
  const directions = [
    [1, 0],   // Ngang
    [0, 1],   // Dọc
    [1, 1],   // Chéo chính
    [1, -1]   // Chéo phụ
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    const line: Position[] = [{x, y}];

    // Check forward
    for (let i = 1; i < WIN_CONDITION; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] === player) {
        count++;
        line.push({x: nx, y: ny});
      } else {
        break;
      }
    }

    // Check backward
    for (let i = 1; i < WIN_CONDITION; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] === player) {
        count++;
        line.push({x: nx, y: ny});
      } else {
        break;
      }
    }

    if (count >= WIN_CONDITION) {
      return line;
    }
  }

  return null;
};

// AI Logic (Heuristic scoring)
export const getBestMove = (board: CellValue[][], aiPlayer: Player): Position => {
  const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X';
  let bestScore = -Infinity;
  let move: Position = { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
  
  // Nếu bàn cờ trống, đánh giữa
  if (board.every(row => row.every(cell => cell === null))) {
     return move;
  }

  // Giới hạn vùng tìm kiếm để tối ưu hiệu năng
  const potentialMoves: Position[] = [];
  const radius = 2; // Tìm xung quanh các ô đã đánh

  for(let y = 0; y < BOARD_SIZE; y++) {
    for(let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue;

      let hasNeighbor = false;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < BOARD_SIZE && nx >= 0 && nx < BOARD_SIZE && board[ny][nx] !== null) {
            hasNeighbor = true;
            break;
          }
        }
        if (hasNeighbor) break;
      }
      if (hasNeighbor) potentialMoves.push({x, y});
    }
  }

  // Chấm điểm từng nước đi
  for (const pos of potentialMoves) {
    const score = evaluateMove(board, pos.x, pos.y, aiPlayer, humanPlayer);
    if (score > bestScore) {
      bestScore = score;
      move = pos;
    }
  }

  return move;
};

const evaluateMove = (board: CellValue[][], x: number, y: number, aiPlayer: Player, humanPlayer: Player): number => {
  // Lấy điểm tấn công (AI tạo thế cờ)
  const attackScore = countConsecutive(board, x, y, aiPlayer);
  
  // Lấy điểm phòng thủ (Chặn Human)
  const defenseScore = countConsecutive(board, x, y, humanPlayer);

  // QUY TẮC VÀNG: Nếu có thể thắng ngay lập tức (>= 5 ô), ĐÁNH NGAY!
  // Điểm số thắng là 100,000 (xem hàm countConsecutive)
  if (attackScore >= 100000) return 200000000; // Ưu tiên số 1: Thắng luôn

  // Nếu đối thủ sắp thắng (>= 5 ô), PHẢI CHẶN!
  if (defenseScore >= 100000) return 100000000; // Ưu tiên số 2: Không để thua

  // Nếu tạo được nước "Open 4" (4 con không bị chặn đầu nào -> chắc chắn thắng), ĐÁNH NGAY!
  if (attackScore >= 10000) return 50000000;
  
  // Nếu đối thủ có "Open 4", PHẢI CHẶN!
  if (defenseScore >= 10000) return 20000000;

  // Chiến thuật thông thường: Tấn công > Phòng thủ một chút để tạo áp lực
  // Nhưng nếu mối đe dọa của đối thủ lớn (ví dụ Open 3), phải cân nhắc chặn.
  return attackScore * 1.2 + defenseScore;
}

const countConsecutive = (board: CellValue[][], x: number, y: number, player: Player): number => {
  let totalScore = 0;
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

  for (const [dx, dy] of directions) {
    let consecutive = 0;
    let blocked = 0;
    
    // Forward
    for (let i = 1; i <= 4; i++) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) { blocked++; break; }
        if (board[ny][nx] === player) consecutive++;
        else if (board[ny][nx] !== null) { blocked++; break; }
        else break;
    }

    // Backward
    for (let i = 1; i <= 4; i++) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) { blocked++; break; }
        if (board[ny][nx] === player) consecutive++;
        else if (board[ny][nx] !== null) { blocked++; break; }
        else break;
    }

    // --- HỆ THỐNG ĐIỂM MỚI (Aggressive hơn) ---
    
    // 5 con liên tiếp (hoặc hơn) -> THẮNG
    if (consecutive >= 4) { // Đã có 4, đánh thêm 1 là 5
        totalScore += 100000; 
    }
    // 4 con liên tiếp (Open 4 - Không bị chặn) -> CHẮC CHẮN THẮNG
    else if (consecutive === 3 && blocked === 0) {
        totalScore += 10000;
    }
    // 4 con bị chặn 1 đầu (Closed 4) -> Cần đánh tiếp để thắng hoặc chặn
    else if (consecutive === 3 && blocked === 1) {
        totalScore += 1500; 
    }
    // 3 con thoáng (Open 3) -> Tiềm năng lớn
    else if (consecutive === 2 && blocked === 0) {
        totalScore += 1000;
    }
    // 3 con bị chặn 1 đầu
    else if (consecutive === 2 && blocked === 1) {
        totalScore += 100;
    }
    // 2 con thoáng
    else if (consecutive === 1 && blocked === 0) {
        totalScore += 50;
    }
    // 2 con bị chặn
    else if (consecutive === 1 && blocked === 1) {
        totalScore += 10;
    }
  }
  return totalScore;
}