/* ========================================================= */
/* GAME 5: ROYAL 3D LUDO CHAMPIONSHIP ENGINE                 */
/* Authentic Rules, 3D Pip Dot Dice & Touch/Mobile Controls  */
/* ========================================================= */

class LudoGame {
    constructor() {
        this.canvas = document.getElementById('ludo-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.size = 600;
        this.canvas.width = this.size;
        this.canvas.height = this.size;

        this.isRunning = false;
        this.mode = 'ai';
        this.difficulty = 'normal';
        this.playerCount = 4; // 2, 3, or 4 players

        this.colors = ['red', 'green', 'yellow', 'blue'];
        this.currentTurnIndex = 0; // 0 = Red, 1 = Green, 2 = Yellow, 3 = Blue
        this.diceValue = 6;
        this.isRolling = false;
        this.canRoll = true;
        this.hasRolled = false;
        this.movableTokens = [];

        // Common Board Track definition (52 tiles around perimeter)
        this.boardTrack = this.generateBoardTrack();
        this.tokens = this.initTokens();

        this.pulseAngle = 0;
        this.setupEventListeners();
        this.startPulseLoop();
    }

    startPulseLoop() {
        const tick = () => {
            if (this.isRunning && this.hasRolled) {
                this.pulseAngle += 0.08;
                this.draw();
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    generateBoardTrack() {
        const track = [];
        const step = this.size / 15;

        // 52 step perimeter path clockwise starting from Red entrance (1, 6)
        const pathCoords = [
            [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
            [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
            [7, 0], [8, 0],
            [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
            [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
            [14, 7], [14, 8],
            [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
            [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
            [7, 14], [6, 14],
            [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
            [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
            [0, 7], [0, 6]
        ];

        pathCoords.forEach(([gx, gy]) => {
            track.push({ x: gx * step + step / 2, y: gy * step + step / 2 });
        });
        return track;
    }

    initTokens() {
        const baseCoords = {
            red: [{ x: 90, y: 90 }, { x: 150, y: 90 }, { x: 90, y: 150 }, { x: 150, y: 150 }],
            green: [{ x: 450, y: 90 }, { x: 510, y: 90 }, { x: 450, y: 150 }, { x: 510, y: 150 }],
            yellow: [{ x: 450, y: 450 }, { x: 510, y: 450 }, { x: 450, y: 510 }, { x: 510, y: 510 }],
            blue: [{ x: 90, y: 450 }, { x: 150, y: 450 }, { x: 90, y: 510 }, { x: 150, y: 510 }]
        };

        const tokens = {};
        this.colors.forEach(col => {
            tokens[col] = [0, 1, 2, 3].map(id => ({
                id: id,
                color: col,
                state: 'home', // 'home', 'track', 'goal'
                trackStep: -1,
                basePos: baseCoords[col][id]
            }));
        });
        return tokens;
    }

    setupEventListeners() {
        const rollBtn = document.getElementById('btn-ludo-roll');
        const diceBox = document.getElementById('ludo-dice-box');

        const doRoll = () => {
            if (!this.isRunning || this.isRolling || !this.canRoll) return;
            this.rollDice();
        };

        if (rollBtn) rollBtn.addEventListener('click', doRoll);
        if (diceBox) diceBox.addEventListener('click', doRoll);

        // Touch and Click canvas support
        const handleBoardInteraction = (clientX, clientY) => {
            if (!this.hasRolled || this.isRolling) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = (clientX - rect.left) * (this.size / rect.width);
            const clickY = (clientY - rect.top) * (this.size / rect.height);
            this.handleCanvasClick(clickX, clickY);
        };

        this.canvas.addEventListener('click', (e) => {
            handleBoardInteraction(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches[0]) {
                handleBoardInteraction(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    init(mode = 'ai', difficulty = 'normal', playerCount = 4) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.playerCount = playerCount;
        this.currentTurnIndex = 0;
        this.tokens = this.initTokens();
        this.canRoll = true;
        this.hasRolled = false;
        this.movableTokens = [];
        this.isRunning = true;

        this.setDiceFaceVisual(6);
        this.updateHUD();
        this.draw();
    }

    setDiceFaceVisual(val) {
        const cube = document.getElementById('dice-cube-element');
        if (cube) {
            cube.className = 'dice-cube';
            cube.classList.add(`show-${val}`);
        }
    }

    rollDice() {
        this.isRolling = true;
        this.canRoll = false;
        this.movableTokens = [];
        window.audioEngine.playDiceRoll();

        const cube = document.getElementById('dice-cube-element');
        if (cube) {
            cube.className = 'dice-cube rolling-3d';
        }

        setTimeout(() => {
            this.diceValue = Math.floor(Math.random() * 6) + 1;
            this.setDiceFaceVisual(this.diceValue);
            this.isRolling = false;
            this.hasRolled = true;
            this.onDiceRolled();
        }, 650);
    }

    onDiceRolled() {
        const color = this.colors[this.currentTurnIndex];
        const playerTokens = this.tokens[color];
        this.movableTokens = playerTokens.filter(t => this.canTokenMove(t, this.diceValue));

        if (this.movableTokens.length === 0) {
            const info = document.getElementById('ludo-info-msg');
            if (info) info.innerText = `No moves for ${color.toUpperCase()} on ${this.diceValue}!`;
            this.clearTokenBar();
            setTimeout(() => this.nextTurn(), 900);
            return;
        }

        const info = document.getElementById('ludo-info-msg');
        if (info) info.innerText = `${color.toUpperCase()} rolled ${this.diceValue}! Tap glowing token to move.`;

        // Render Touch Token Selector Bar for mobile
        this.renderTokenHelperBar();

        // If Bot's turn, auto select best move
        if (this.currentTurnIndex > 0 && this.mode === 'ai') {
            setTimeout(() => this.makeAIMove(this.movableTokens), 700);
        }
    }

    renderTokenHelperBar() {
        const bar = document.getElementById('ludo-token-bar');
        if (!bar) return;
        bar.innerHTML = '';

        if (this.currentTurnIndex === 0 || this.mode !== 'ai') {
            this.movableTokens.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'btn-token-pick';
                btn.innerText = `♟️ Move Token ${t.id + 1} (${t.state === 'home' ? 'Open' : '+' + this.diceValue})`;
                btn.onclick = () => this.moveToken(t, this.diceValue);
                bar.appendChild(btn);
            });
        }
    }

    clearTokenBar() {
        const bar = document.getElementById('ludo-token-bar');
        if (bar) bar.innerHTML = '';
    }

    canTokenMove(token, dice) {
        if (token.state === 'home' && dice === 6) return true;
        if (token.state === 'track' && token.trackStep + dice <= 57) return true;
        return false;
    }

    handleCanvasClick(x, y) {
        if (this.currentTurnIndex > 0 && this.mode === 'ai') return;
        if (!this.hasRolled || this.movableTokens.length === 0) return;

        for (const token of this.movableTokens) {
            const pos = this.getTokenScreenPos(token);
            const dist = Math.hypot(x - pos.x, y - pos.y);
            if (dist < 32) {
                this.moveToken(token, this.diceValue);
                break;
            }
        }
    }

    makeAIMove(validMoves) {
        // Smart AI: Prefer opening from home, or capturing opponent
        let bestToken = validMoves[0];
        for (const t of validMoves) {
            if (t.state === 'home' && this.diceValue === 6) {
                bestToken = t;
                break;
            }
        }
        this.moveToken(bestToken, this.diceValue);
    }

    moveToken(token, dice) {
        this.hasRolled = false;
        this.movableTokens = [];
        this.clearTokenBar();
        window.audioEngine.playTokenMove();

        if (token.state === 'home' && dice === 6) {
            token.state = 'track';
            token.trackStep = 0;
        } else if (token.state === 'track') {
            token.trackStep += dice;
            if (token.trackStep >= 57) {
                token.state = 'goal';
            }
        }

        // Capture check on standard track
        let captured = false;
        if (token.state === 'track' && token.trackStep < 52) {
            const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
            const globalIndex = (startOffsets[token.color] + token.trackStep) % 52;

            // Safe stars at 0, 8, 13, 21, 26, 34, 39, 47
            const safeTiles = [0, 8, 13, 21, 26, 34, 39, 47];
            if (!safeTiles.includes(globalIndex)) {
                for (const col of this.colors) {
                    if (col === token.color) continue;
                    for (const enemy of this.tokens[col]) {
                        if (enemy.state === 'track' && enemy.trackStep < 52) {
                            const enemyGlobal = (startOffsets[col] + enemy.trackStep) % 52;
                            if (enemyGlobal === globalIndex) {
                                enemy.state = 'home';
                                enemy.trackStep = -1;
                                captured = true;
                                window.audioEngine.playCrash();
                            }
                        }
                    }
                }
            }
        }

        this.draw();

        // Win check
        const allInGoal = this.tokens[token.color].every(t => t.state === 'goal');
        if (allInGoal) {
            window.audioEngine.playWinFanfare();
            window.particleEngine.triggerConfetti();
            window.hubManager.showGameOver({
                title: `${token.color.toUpperCase()} CHAMPION!`,
                msg: `All tokens safely reached home in victory!`,
                xp: 300,
                coins: 150
            });
            return;
        }

        // Extra turn for 6 or capture
        if (dice === 6 || captured) {
            this.canRoll = true;
            const info = document.getElementById('ludo-info-msg');
            if (info) info.innerText = `${token.color.toUpperCase()} earned a BONUS roll!`;
            if (this.currentTurnIndex > 0 && this.mode === 'ai') {
                setTimeout(() => this.rollDice(), 700);
            }
        } else {
            this.nextTurn();
        }
    }

    nextTurn() {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerCount;
        this.canRoll = true;
        this.hasRolled = false;
        this.movableTokens = [];
        this.clearTokenBar();
        this.updateHUD();

        if (this.currentTurnIndex > 0 && this.mode === 'ai') {
            setTimeout(() => this.rollDice(), 700);
        }
    }

    getTokenScreenPos(token) {
        if (token.state === 'home') {
            return token.basePos;
        }
        if (token.state === 'goal') {
            return { x: this.size / 2, y: this.size / 2 };
        }
        const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
        const globalIndex = (startOffsets[token.color] + token.trackStep) % 52;
        return this.boardTrack[globalIndex] || { x: 300, y: 300 };
    }

    draw() {
        const ctx = this.ctx;
        const s = this.size;
        ctx.clearRect(0, 0, s, s);

        // 1. Board Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, s, s);

        const step = s / 15;

        // Bases (Red, Green, Yellow, Blue)
        ctx.fillStyle = '#ff3366'; ctx.fillRect(0, 0, step * 6, step * 6);
        ctx.fillStyle = '#00f5a0'; ctx.fillRect(step * 9, 0, step * 6, step * 6);
        ctx.fillStyle = '#f8d800'; ctx.fillRect(step * 9, step * 9, step * 6, step * 6);
        ctx.fillStyle = '#4facfe'; ctx.fillRect(0, step * 9, step * 6, step * 6);

        // Base Inner White Squares
        ctx.fillStyle = '#fff';
        ctx.fillRect(step, step, step * 4, step * 4);
        ctx.fillRect(step * 10, step, step * 4, step * 4);
        ctx.fillRect(step * 10, step * 10, step * 4, step * 4);
        ctx.fillRect(step, step * 10, step * 4, step * 4);

        // Grid Lines
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 15; i++) {
            ctx.beginPath();
            ctx.moveTo(i * step, 0); ctx.lineTo(i * step, s);
            ctx.moveTo(0, i * step); ctx.lineTo(s, i * step);
            ctx.stroke();
        }

        // Home Columns (Colored path to center)
        ctx.fillStyle = '#ff3366';
        for (let i = 1; i <= 5; i++) ctx.fillRect(i * step, step * 7, step, step);

        ctx.fillStyle = '#00f5a0';
        for (let i = 1; i <= 5; i++) ctx.fillRect(step * 7, i * step, step, step);

        ctx.fillStyle = '#f8d800';
        for (let i = 9; i <= 13; i++) ctx.fillRect(i * step, step * 7, step, step);

        ctx.fillStyle = '#4facfe';
        for (let i = 9; i <= 13; i++) ctx.fillRect(step * 7, i * step, step, step);

        // Center Triangles
        ctx.beginPath();
        ctx.moveTo(step * 6, step * 6); ctx.lineTo(s / 2, s / 2); ctx.lineTo(step * 6, step * 9);
        ctx.fillStyle = '#ff3366'; ctx.fill();

        ctx.beginPath();
        ctx.moveTo(step * 6, step * 6); ctx.lineTo(s / 2, s / 2); ctx.lineTo(step * 9, step * 6);
        ctx.fillStyle = '#00f5a0'; ctx.fill();

        ctx.beginPath();
        ctx.moveTo(step * 9, step * 6); ctx.lineTo(s / 2, s / 2); ctx.lineTo(step * 9, step * 9);
        ctx.fillStyle = '#f8d800'; ctx.fill();

        ctx.beginPath();
        ctx.moveTo(step * 6, step * 9); ctx.lineTo(s / 2, s / 2); ctx.lineTo(step * 9, step * 9);
        ctx.fillStyle = '#4facfe'; ctx.fill();

        // Safe Star icons on board
        const starIndices = [0, 8, 13, 21, 26, 34, 39, 47];
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        starIndices.forEach(idx => {
            const p = this.boardTrack[idx];
            if (p) ctx.fillText('★', p.x, p.y);
        });

        // 2. Draw Tokens & Pulsing Rings for Movable Tokens
        this.colors.forEach(col => {
            this.tokens[col].forEach(t => {
                const pos = this.getTokenScreenPos(t);
                const isMovable = this.movableTokens.includes(t);

                ctx.save();

                // Pulsing Glow Ring for Movable Tokens
                if (isMovable) {
                    const glowRadius = 20 + Math.sin(this.pulseAngle) * 4;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#00f2fe';
                    ctx.fill();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#00f2fe';
                    ctx.stroke();
                }

                // Token Body
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);

                const colMap = { red: '#ff3366', green: '#00f5a0', yellow: '#f8d800', blue: '#4facfe' };
                ctx.fillStyle = colMap[col];
                ctx.shadowBlur = isMovable ? 18 : 8;
                ctx.shadowColor = isMovable ? '#fff' : colMap[col];
                ctx.fill();

                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                ctx.fillStyle = '#000';
                ctx.font = 'bold 12px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('♟', pos.x, pos.y);

                ctx.restore();
            });
        });
    }

    updateHUD() {
        const color = this.colors[this.currentTurnIndex];
        const tags = document.querySelectorAll('.ludo-p-tag');
        tags.forEach(t => t.classList.remove('active'));

        const activeTag = document.getElementById(`ludo-p-${color}`);
        if (activeTag) activeTag.classList.add('active');

        const info = document.getElementById('ludo-info-msg');
        if (info) info.innerText = `${color.toUpperCase()}'s Turn - Tap Dice to Roll!`;
        this.draw();
    }
}

window.ludoGame = new LudoGame();
