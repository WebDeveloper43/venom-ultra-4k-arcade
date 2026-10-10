/* ========================================================= */
/* GAME 2: NEON TIC TAC TOE ENGINE (Minimax AI + Grid Modes) */
/* ========================================================= */

class TicTacToeGame {
    constructor() {
        this.boardContainer = document.getElementById('ttt-grid-board');
        this.statusBanner = document.getElementById('ttt-turn-status');
        this.size = 3;
        this.board = [];
        this.currentPlayer = 'X';
        this.isGameOver = false;
        this.mode = 'ai'; // 'ai', 'local', 'online'
        this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
        this.scores = { X: 0, O: 0 };
        this.winCondition = 3; // 3 in a row for 3x3, 4 for 4x4 & 5x5

        this.setupSizeButtons();
    }

    setupSizeButtons() {
        const sizeBtns = document.querySelectorAll('.btn-ttt-size');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.size = parseInt(btn.dataset.size);
                this.winCondition = this.size === 3 ? 3 : 4;
                this.reset();
            });
        });
    }

    init(mode = 'ai', difficulty = 'normal') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.updatePlayerHUD();
        this.reset();
    }

    updatePlayerHUD() {
        const p1Name = document.getElementById('ttt-p1-name');
        const p2Name = document.getElementById('ttt-p2-name');
        if (p1Name) p1Name.innerText = "Player X";
        if (p2Name) {
            if (this.mode === 'ai') p2Name.innerText = `AI (${this.difficulty.toUpperCase()})`;
            else if (this.mode === 'online') p2Name.innerText = "Online Rival";
            else p2Name.innerText = "Player O (Friend)";
        }
    }

    reset() {
        this.board = Array(this.size * this.size).fill('');
        this.currentPlayer = 'X';
        this.isGameOver = false;
        this.renderBoard();
        this.updateStatus();
    }

    renderBoard() {
        if (!this.boardContainer) return;
        this.boardContainer.className = `ttt-board grid-${this.size}x${this.size}`;
        this.boardContainer.innerHTML = '';

        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'ttt-cell';
            cell.dataset.index = i;
            if (this.board[i] === 'X') {
                cell.classList.add('x');
                cell.innerText = '✕';
            } else if (this.board[i] === 'O') {
                cell.classList.add('o');
                cell.innerText = '◯';
            }

            cell.addEventListener('click', () => this.handleCellClick(i));
            this.boardContainer.appendChild(cell);
        }
    }

    handleCellClick(index) {
        if (this.isGameOver || this.board[index] !== '') return;
        if (this.mode === 'ai' && this.currentPlayer === 'O') return;

        this.makeMove(index, this.currentPlayer);

        if (!this.isGameOver && this.mode === 'ai' && this.currentPlayer === 'O') {
            setTimeout(() => this.makeAIMove(), 350);
        }
    }

    makeMove(index, player) {
        this.board[index] = player;
        window.audioEngine.playLaser();
        this.renderBoard();

        const winResult = this.checkWin(this.board, this.size, this.winCondition);
        if (winResult) {
            this.isGameOver = true;
            this.highlightWinningCells(winResult.combo);
            this.scores[player]++;
            this.updateScoreboard();

            window.audioEngine.playWinFanfare();
            window.particleEngine.triggerConfetti();

            setTimeout(() => {
                window.hubManager.showGameOver({
                    title: `${player === 'X' ? 'PLAYER X' : 'OPPONENT'} WINS!`,
                    msg: `Incredible tactical victory on the ${this.size}x${this.size} Neon Grid!`,
                    xp: 150,
                    coins: 50
                });
            }, 900);
            return;
        }

        if (this.board.every(cell => cell !== '')) {
            this.isGameOver = true;
            this.statusBanner.innerText = "DRAW / TIE GAME!";
            setTimeout(() => {
                window.hubManager.showGameOver({
                    title: "STALEMATE TIE!",
                    msg: "Both players played with tactical perfection!",
                    xp: 50,
                    coins: 20
                });
            }, 800);
            return;
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateStatus();
    }

    makeAIMove() {
        if (this.isGameOver) return;
        let bestIndex;

        if (this.difficulty === 'easy') {
            // Random move
            const emptyIndices = this.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
            bestIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else if (this.difficulty === 'normal') {
            // Check immediate win or immediate block, else random
            bestIndex = this.findTacticalMove('O') || this.findTacticalMove('X');
            if (bestIndex === undefined) {
                const emptyIndices = this.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
                bestIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            }
        } else {
            // Hard / Master: Minimax with Alpha-Beta
            if (this.size === 3) {
                bestIndex = this.getMinimaxMove();
            } else {
                // Heuristic evaluation for larger boards to keep performance fast
                bestIndex = this.findTacticalMove('O') || this.findTacticalMove('X');
                if (bestIndex === undefined) {
                    const center = Math.floor((this.size * this.size) / 2);
                    if (this.board[center] === '') bestIndex = center;
                    else {
                        const emptyIndices = this.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
                        bestIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                    }
                }
            }
        }

        if (bestIndex !== undefined && bestIndex !== null) {
            this.makeMove(bestIndex, 'O');
        }
    }

    findTacticalMove(player) {
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] === '') {
                const testBoard = [...this.board];
                testBoard[i] = player;
                if (this.checkWin(testBoard, this.size, this.winCondition)) {
                    return i;
                }
            }
        }
        return null;
    }

    getMinimaxMove() {
        let bestScore = -Infinity;
        let move = null;
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = 'O';
                const score = this.minimax(this.board, 0, false, -Infinity, Infinity);
                this.board[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    minimax(board, depth, isMaximizing, alpha, beta) {
        const win = this.checkWin(board, 3, 3);
        if (win && win.player === 'O') return 10 - depth;
        if (win && win.player === 'X') return depth - 10;
        if (board.every(cell => cell !== '')) return 0;
        if (depth >= 6) return 0;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'O';
                    const evaluation = this.minimax(board, depth + 1, false, alpha, beta);
                    board[i] = '';
                    maxEval = Math.max(maxEval, evaluation);
                    alpha = Math.max(alpha, evaluation);
                    if (beta <= alpha) break;
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'X';
                    const evaluation = this.minimax(board, depth + 1, true, alpha, beta);
                    board[i] = '';
                    minEval = Math.min(minEval, evaluation);
                    beta = Math.min(beta, evaluation);
                    if (beta <= alpha) break;
                }
            }
            return minEval;
        }
    }

    checkWin(b, size, target) {
        const lines = [];

        // Rows
        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - target; c++) {
                const line = [];
                for (let k = 0; k < target; k++) line.push(r * size + (c + k));
                lines.push(line);
            }
        }

        // Columns
        for (let c = 0; c < size; c++) {
            for (let r = 0; r <= size - target; r++) {
                const line = [];
                for (let k = 0; k < target; k++) line.push((r + k) * size + c);
                lines.push(line);
            }
        }

        // Diagonals (Top-Left to Bottom-Right)
        for (let r = 0; r <= size - target; r++) {
            for (let c = 0; c <= size - target; c++) {
                const line = [];
                for (let k = 0; k < target; k++) line.push((r + k) * size + (c + k));
                lines.push(line);
            }
        }

        // Anti-Diagonals (Top-Right to Bottom-Left)
        for (let r = 0; r <= size - target; r++) {
            for (let c = target - 1; c < size; c++) {
                const line = [];
                for (let k = 0; k < target; k++) line.push((r + k) * size + (c - k));
                lines.push(line);
            }
        }

        for (const combo of lines) {
            const first = b[combo[0]];
            if (first !== '' && combo.every(idx => b[idx] === first)) {
                return { player: first, combo: combo };
            }
        }
        return null;
    }

    highlightWinningCells(combo) {
        const cells = document.querySelectorAll('.ttt-cell');
        combo.forEach(idx => {
            if (cells[idx]) cells[idx].classList.add('winning-cell');
        });
    }

    updateStatus() {
        if (!this.statusBanner) return;
        this.statusBanner.innerText = `${this.currentPlayer === 'X' ? 'Player X' : 'Player O'}'s Turn`;

        const p1Card = document.getElementById('ttt-card-p1');
        const p2Card = document.getElementById('ttt-card-p2');
        if (p1Card && p2Card) {
            p1Card.classList.toggle('active', this.currentPlayer === 'X');
            p2Card.classList.toggle('active', this.currentPlayer === 'O');
        }
    }

    updateScoreboard() {
        const p1Score = document.getElementById('ttt-p1-score');
        const p2Score = document.getElementById('ttt-p2-score');
        if (p1Score) p1Score.innerText = `${this.scores.X} Wins`;
        if (p2Score) p2Score.innerText = `${this.scores.O} Wins`;
    }
}

window.tttGame = new TicTacToeGame();
