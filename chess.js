/* ========================================================= */
/* GAME 6: GRANDMASTER 4K LUXURY CHESS ENGINE               */
/* Full FIDE Rules, Minimax AI, Notation & Timers           */
/* ========================================================= */

class ChessGame {
    constructor() {
        this.boardEl = document.getElementById('chessboard');
        this.statusText = document.getElementById('chess-status-text');
        this.historyList = document.getElementById('chess-move-history');
        this.whiteGraveyard = document.getElementById('chess-white-graveyard');
        this.blackGraveyard = document.getElementById('chess-black-graveyard');

        this.board = [];
        this.turn = 'w'; // 'w' or 'b'
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.isGameOver = false;
        this.mode = 'ai';
        this.difficulty = 'normal';

        // Castling & En Passant Rights
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassantTarget = null; // {r, c}
        this.capturedPieces = { w: [], b: [] };

        // Timers
        this.timers = { w: 600, b: 600 };
        this.timerInterval = null;

        // Piece Unicode Mapping
        this.symbols = {
            'wP': '♙', 'wN': '♘', 'wB': '♗', 'wR': '♖', 'wQ': '♕', 'wK': '♔',
            'bP': '♟', 'bN': '♞', 'bB': '♝', 'bR': '♜', 'bQ': '♛', 'bK': '♚'
        };

        // Piece Values for AI
        this.pieceValues = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000 };
    }

    init(mode = 'ai', difficulty = 'normal') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.resetGame();
    }

    resetGame() {
        this.board = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];

        this.turn = 'w';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.isGameOver = false;
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassantTarget = null;
        this.capturedPieces = { w: [], b: [] };
        this.timers = { w: 600, b: 600 };

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startTimer();

        this.renderBoard();
        this.updateHUD();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isGameOver) return;
            if (this.turn === 'w') {
                this.timers.w--;
                if (this.timers.w <= 0) this.onTimeOut('w');
            } else {
                this.timers.b--;
                if (this.timers.b <= 0) this.onTimeOut('b');
            }
            this.updateClocks();
        }, 1000);
    }

    updateClocks() {
        const pClock = document.getElementById('chess-player-clock');
        const oppClock = document.getElementById('chess-opp-clock');
        const fmt = (s) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        };
        if (pClock) pClock.innerText = fmt(this.timers.w);
        if (oppClock) oppClock.innerText = fmt(this.timers.b);
    }

    renderBoard() {
        if (!this.boardEl) return;
        this.boardEl.innerHTML = '';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = document.createElement('div');
                sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                sq.dataset.row = r;
                sq.dataset.col = c;

                const piece = this.board[r][c];
                if (piece) {
                    const pSpan = document.createElement('span');
                    pSpan.className = `chess-piece ${piece.startsWith('w') ? 'white-piece' : 'black-piece'}`;
                    pSpan.innerText = this.symbols[piece];
                    sq.appendChild(pSpan);
                }

                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    sq.classList.add('selected');
                }

                // Highlight legal moves
                const isLegal = this.legalMoves.find(m => m.r === r && m.c === c);
                if (isLegal) {
                    if (piece) sq.classList.add('legal-capture');
                    else sq.classList.add('legal-move');
                }

                sq.addEventListener('click', () => this.handleSquareClick(r, c));
                this.boardEl.appendChild(sq);
            }
        }
    }

    handleSquareClick(r, c) {
        if (this.isGameOver) return;
        if (this.turn === 'b' && this.mode === 'ai') return;

        const clickedPiece = this.board[r][c];

        // 1. If clicking own piece, select it
        if (clickedPiece && clickedPiece.startsWith(this.turn)) {
            this.selectedSquare = { r, c };
            this.legalMoves = this.getValidMovesForSquare(r, c, this.board, this.turn);
            this.renderBoard();
            return;
        }

        // 2. If already selected a piece and clicked a legal move destination
        if (this.selectedSquare) {
            const move = this.legalMoves.find(m => m.r === r && m.c === c);
            if (move) {
                this.executeMove(this.selectedSquare.r, this.selectedSquare.c, r, c, move);
                this.selectedSquare = null;
                this.legalMoves = [];
                this.renderBoard();

                if (!this.isGameOver && this.turn === 'b' && this.mode === 'ai') {
                    setTimeout(() => this.makeAIMove(), 400);
                }
            } else {
                this.selectedSquare = null;
                this.legalMoves = [];
                this.renderBoard();
            }
        }
    }

    executeMove(fromR, fromC, toR, toC, moveData = {}) {
        const piece = this.board[fromR][fromC];
        const targetPiece = this.board[toR][toC];

        // Capture tracking
        if (targetPiece) {
            this.capturedPieces[this.turn].push(targetPiece);
            window.audioEngine.playChessMove();
        } else {
            window.audioEngine.playChessMove();
        }

        // En Passant Capture
        if (piece[1] === 'P' && this.enPassantTarget && toR === this.enPassantTarget.r && toC === this.enPassantTarget.c) {
            const captureRow = this.turn === 'w' ? toR + 1 : toR - 1;
            const enPassantPiece = this.board[captureRow][toC];
            this.capturedPieces[this.turn].push(enPassantPiece);
            this.board[captureRow][toC] = '';
        }

        // Update En Passant Target
        if (piece[1] === 'P' && Math.abs(toR - fromR) === 2) {
            this.enPassantTarget = { r: (fromR + toR) / 2, c: toC };
        } else {
            this.enPassantTarget = null;
        }

        // Castling Move Execution
        if (piece[1] === 'K' && Math.abs(toC - fromC) === 2) {
            if (toC === 6) { // Kingside
                this.board[fromR][5] = this.board[fromR][7];
                this.board[fromR][7] = '';
            } else if (toC === 2) { // Queenside
                this.board[fromR][3] = this.board[fromR][0];
                this.board[fromR][0] = '';
            }
        }

        // Pawn Promotion (Auto Queen for AI, default Queen)
        let finalPiece = piece;
        if (piece[1] === 'P' && (toR === 0 || toR === 7)) {
            finalPiece = `${this.turn}Q`;
        }

        // Move piece
        this.board[toR][toC] = finalPiece;
        this.board[fromR][fromC] = '';

        // Record notation
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const notate = `${piece[1] !== 'P' ? piece[1] : ''}${files[fromC]}${8 - fromR}→${files[toC]}${8 - toR}`;
        this.moveHistory.push(notate);

        // Switch Turn
        this.turn = this.turn === 'w' ? 'b' : 'w';

        // Check for Check / Checkmate
        const inCheck = this.isKingInCheck(this.turn, this.board);
        const allLegal = this.getAllLegalMoves(this.turn, this.board);

        if (allLegal.length === 0) {
            this.isGameOver = true;
            if (inCheck) {
                const winner = this.turn === 'w' ? 'Black / AI' : 'White (Player 1)';
                window.audioEngine.playWinFanfare();
                window.particleEngine.triggerConfetti();
                window.hubManager.showGameOver({
                    title: `CHECKMATE! ${winner.toUpperCase()} WINS!`,
                    msg: `Supreme tactical mastery achieved on the 4K Luxury Chessboard!`,
                    xp: 400,
                    coins: 200
                });
            } else {
                window.hubManager.showGameOver({
                    title: "STALEMATE DRAW!",
                    msg: "No legal moves remaining without check. Peaceful conclusion!",
                    xp: 100,
                    coins: 40
                });
            }
        } else if (inCheck) {
            window.audioEngine.playCheckAlert();
            if (this.statusText) this.statusText.innerText = `⚠️ CHECK on ${this.turn === 'w' ? 'White' : 'Black'} King!`;
        } else {
            if (this.statusText) this.statusText.innerText = `${this.turn === 'w' ? 'White' : 'Black'}'s Turn`;
        }

        this.updateHUD();
    }

    makeAIMove() {
        if (this.isGameOver || this.turn !== 'b') return;

        let bestMove = null;
        if (this.difficulty === 'easy') {
            const all = this.getAllLegalMoves('b', this.board);
            bestMove = all[Math.floor(Math.random() * all.length)];
        } else if (this.difficulty === 'normal') {
            bestMove = this.getMinimaxAIMove(2);
        } else {
            bestMove = this.getMinimaxAIMove(3);
        }

        if (bestMove) {
            this.executeMove(bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC);
            this.renderBoard();
        }
    }

    getMinimaxAIMove(depth) {
        const moves = this.getAllLegalMoves('b', this.board);
        let bestScore = -Infinity;
        let bestMove = moves[0];

        for (const m of moves) {
            const tempBoard = this.board.map(r => [...r]);
            tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
            tempBoard[m.fromR][m.fromC] = '';

            const score = this.minimax(tempBoard, depth - 1, false, -Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }
        }
        return bestMove;
    }

    minimax(board, depth, isMaximizing, alpha, beta) {
        if (depth === 0) return this.evaluateBoard(board);

        const currentTurn = isMaximizing ? 'b' : 'w';
        const moves = this.getAllLegalMoves(currentTurn, board);

        if (moves.length === 0) {
            if (this.isKingInCheck(currentTurn, board)) return isMaximizing ? -10000 : 10000;
            return 0; // Stalemate
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const m of moves) {
                const tempBoard = board.map(r => [...r]);
                tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
                tempBoard[m.fromR][m.fromC] = '';
                const ev = this.minimax(tempBoard, depth - 1, false, alpha, beta);
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of moves) {
                const tempBoard = board.map(r => [...r]);
                tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
                tempBoard[m.fromR][m.fromC] = '';
                const ev = this.minimax(tempBoard, depth - 1, true, alpha, beta);
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard(board) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                const val = this.pieceValues[p[1]];
                if (p.startsWith('b')) score += val;
                else score -= val;
            }
        }
        return score;
    }

    getAllLegalMoves(color, board) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.startsWith(color)) {
                    const valid = this.getValidMovesForSquare(r, c, board, color);
                    valid.forEach(dest => {
                        moves.push({ fromR: r, fromC: c, toR: dest.r, toC: dest.c });
                    });
                }
            }
        }
        return moves;
    }

    getValidMovesForSquare(r, c, board, color) {
        const rawMoves = this.getRawMoves(r, c, board, color);
        // Filter out moves that leave own king in check
        return rawMoves.filter(dest => {
            const tempBoard = board.map(row => [...row]);
            tempBoard[dest.r][dest.c] = tempBoard[r][c];
            tempBoard[r][c] = '';
            return !this.isKingInCheck(color, tempBoard);
        });
    }

    getRawMoves(r, c, board, color) {
        const p = board[r][c];
        if (!p) return [];
        const type = p[1];
        const moves = [];
        const dir = color === 'w' ? -1 : 1;

        // PAWN
        if (type === 'P') {
            if (board[r + dir] && board[r + dir][c] === '') {
                moves.push({ r: r + dir, c: c });
                const startRow = color === 'w' ? 6 : 1;
                if (r === startRow && board[r + 2 * dir][c] === '') {
                    moves.push({ r: r + 2 * dir, c: c });
                }
            }
            // Diagonal Captures
            [-1, 1].forEach(dc => {
                const targetR = r + dir;
                const targetC = c + dc;
                if (targetR >= 0 && targetR < 8 && targetC >= 0 && targetC < 8) {
                    const target = board[targetR][targetC];
                    if (target && !target.startsWith(color)) {
                        moves.push({ r: targetR, c: targetC });
                    } else if (this.enPassantTarget && this.enPassantTarget.r === targetR && this.enPassantTarget.c === targetC) {
                        moves.push({ r: targetR, c: targetC });
                    }
                }
            });
        }

        // KNIGHT
        if (type === 'N') {
            const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            offsets.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = board[nr][nc];
                    if (!target || !target.startsWith(color)) moves.push({ r: nr, c: nc });
                }
            });
        }

        // BISHOP & ROOK & QUEEN
        const addSlidingMoves = (directions) => {
            directions.forEach(([dr, dc]) => {
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = board[nr][nc];
                    if (!target) {
                        moves.push({ r: nr, c: nc });
                    } else {
                        if (!target.startsWith(color)) moves.push({ r: nr, c: nc });
                        break;
                    }
                    nr += dr; nc += dc;
                }
            });
        };

        if (type === 'B' || type === 'Q') {
            addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        }
        if (type === 'R' || type === 'Q') {
            addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
        }

        // KING
        if (type === 'K') {
            const kingDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            kingDirs.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = board[nr][nc];
                    if (!target || !target.startsWith(color)) moves.push({ r: nr, c: nc });
                }
            });

            // Castling
            if (color === 'w' && r === 7 && c === 4) {
                if (this.castling.wK && board[7][5] === '' && board[7][6] === '' && board[7][7] === 'wR') {
                    moves.push({ r: 7, c: 6 });
                }
                if (this.castling.wQ && board[7][1] === '' && board[7][2] === '' && board[7][3] === '' && board[7][0] === 'wR') {
                    moves.push({ r: 7, c: 2 });
                }
            }
        }

        return moves;
    }

    isKingInCheck(color, board) {
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === `${color}K`) {
                    kingPos = { r, c };
                    break;
                }
            }
        }
        if (!kingPos) return true;

        const enemyColor = color === 'w' ? 'b' : 'w';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.startsWith(enemyColor)) {
                    const raw = this.getRawMoves(r, c, board, enemyColor);
                    if (raw.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateHUD() {
        if (this.historyList) {
            this.historyList.innerHTML = '';
            for (let i = 0; i < this.moveHistory.length; i += 2) {
                const entry = document.createElement('div');
                entry.className = 'history-entry';
                entry.innerHTML = `<span>${Math.floor(i / 2) + 1}.</span> <span>${this.moveHistory[i]}</span> <span>${this.moveHistory[i + 1] || ''}</span>`;
                this.historyList.appendChild(entry);
            }
            this.historyList.scrollTop = this.historyList.scrollHeight;
        }

        if (this.whiteGraveyard) {
            this.whiteGraveyard.innerHTML = this.capturedPieces.w.map(p => this.symbols[p]).join(' ');
        }
        if (this.blackGraveyard) {
            this.blackGraveyard.innerHTML = this.capturedPieces.b.map(p => this.symbols[p]).join(' ');
        }
    }

    onTimeOut(color) {
        this.isGameOver = true;
        const winner = color === 'w' ? 'Black / AI' : 'White';
        window.hubManager.showGameOver({
            title: "TIME EXPIRED!",
            msg: `${winner.toUpperCase()} won on time countdown!`,
            xp: 150,
            coins: 50
        });
    }
}

window.chessGame = new ChessGame();
