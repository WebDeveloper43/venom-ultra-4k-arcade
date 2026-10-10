/* ========================================================= */
/* GAME 3: ULTRA PHYSICS CARROM BOARD MASTER ENGINE          */
/* Realistic 2D Rigid-Body Physics + Angle Guide + Bot AI   */
/* ========================================================= */

class CarromGame {
    constructor() {
        this.canvas = document.getElementById('carrom-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 600;
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;

        this.isRunning = false;
        this.isMoving = false;
        this.mode = 'ai';
        this.difficulty = 'normal';
        this.turn = 1; // 1 = White (Player 1), 2 = Black (AI/Player 2)

        // Physics Constants
        this.friction = 0.982;
        this.pocketRadius = 26;
        this.pockets = [
            { x: 38, y: 38 },
            { x: 562, y: 38 },
            { x: 38, y: 562 },
            { x: 562, y: 562 }
        ];

        // Scores & Queen State
        this.scores = { p1: 0, p2: 0 };
        this.queenState = 'board'; // 'board', 'p1_pending', 'p2_pending', 'pocketed'

        // Aiming & Striker Controls
        this.aimAngle = -Math.PI / 2;
        this.power = 45;
        this.strikerBasePos = 0.5; // 0 to 1 along baseline
        this.isAiming = true;

        // Pieces Array
        this.coins = [];
        this.striker = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const posSlider = document.getElementById('carrom-striker-pos');
        if (posSlider) {
            posSlider.addEventListener('input', (e) => {
                this.strikerBasePos = parseFloat(e.target.value) / 100;
                this.updateStrikerPosition();
            });
        }

        const strikeBtn = document.getElementById('btn-carrom-strike');
        if (strikeBtn) {
            strikeBtn.addEventListener('click', () => {
                if (this.isAiming && !this.isMoving) {
                    this.fireStriker();
                }
            });
        }

        // Canvas Click / Drag Aiming
        let isDraggingAim = false;
        const getCanvasCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            return {
                x: (clientX - rect.left) * (this.boardSize / rect.width),
                y: (clientY - rect.top) * (this.boardSize / rect.height)
            };
        };

        const onPointerDown = (e) => {
            if (!this.isAiming || this.isMoving) return;
            const pt = getCanvasCoords(e);
            const dx = pt.x - this.striker.x;
            const dy = pt.y - this.striker.y;
            this.aimAngle = Math.atan2(dy, dx);
            isDraggingAim = true;
        };

        const onPointerMove = (e) => {
            if (!isDraggingAim) return;
            const pt = getCanvasCoords(e);
            const dx = pt.x - this.striker.x;
            const dy = pt.y - this.striker.y;
            this.aimAngle = Math.atan2(dy, dx);
            const dist = Math.hypot(dx, dy);
            this.power = Math.max(15, Math.min(100, dist * 0.5));
            this.updatePowerHUD();
        };

        const onPointerUp = () => {
            isDraggingAim = false;
        };

        this.canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp, { passive: true });
    }

    init(mode = 'ai', difficulty = 'normal') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.scores = { p1: 0, p2: 0 };
        this.queenState = 'board';
        this.turn = 1;
        this.resetBoard();
        this.isRunning = true;
        this.loop();
    }

    resetBoard() {
        this.coins = [];
        const cx = this.boardSize / 2;
        const cy = this.boardSize / 2;
        const r = 13; // coin radius

        // Center Queen (Red)
        this.coins.push({ x: cx, y: cy, vx: 0, vy: 0, radius: r, type: 'queen', color: '#ff3366', pts: 25, mass: 1 });

        // Inner ring: 6 alternating coins (3 White, 3 Black)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const dist = r * 2.1;
            const type = i % 2 === 0 ? 'white' : 'black';
            this.coins.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                radius: r,
                type: type,
                color: type === 'white' ? '#f5f5f5' : '#222222',
                pts: type === 'white' ? 10 : 5,
                mass: 1
            });
        }

        // Outer ring: 12 alternating coins
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 + Math.PI / 12;
            const dist = r * 4.1;
            const type = i % 2 === 0 ? 'black' : 'white';
            this.coins.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                radius: r,
                type: type,
                color: type === 'white' ? '#f5f5f5' : '#222222',
                pts: type === 'white' ? 10 : 5,
                mass: 1
            });
        }

        // Striker
        this.striker = {
            x: cx,
            y: 495,
            vx: 0,
            vy: 0,
            radius: 19,
            color: '#ffd700',
            mass: 2.5
        };

        this.updateStrikerPosition();
        this.isAiming = true;
        this.isMoving = false;
        this.updateHUD();
    }

    updateStrikerPosition() {
        const baselineY = this.turn === 1 ? 495 : 105;
        const minX = 135;
        const maxX = 465;
        this.striker.x = minX + this.strikerBasePos * (maxX - minX);
        this.striker.y = baselineY;
        this.striker.vx = 0;
        this.striker.vy = 0;
    }

    updatePowerHUD() {
        const fill = document.getElementById('carrom-power-fill');
        if (fill) fill.style.height = this.power + '%';
    }

    fireStriker() {
        const force = (this.power / 100) * 22;
        this.striker.vx = Math.cos(this.aimAngle) * force;
        this.striker.vy = Math.sin(this.aimAngle) * force;
        this.isAiming = false;
        this.isMoving = true;
        window.audioEngine.playCarromHit(this.power / 10);
    }

    update() {
        if (!this.isRunning) return;

        let anyMoved = false;
        const allBodies = [this.striker, ...this.coins];

        // 1. Move & apply friction
        for (const body of allBodies) {
            if (!body) continue;
            const speed = Math.hypot(body.vx, body.vy);
            if (speed > 0.05) {
                anyMoved = true;
                body.x += body.vx;
                body.y += body.vy;
                body.vx *= this.friction;
                body.vy *= this.friction;
            } else {
                body.vx = 0;
                body.vy = 0;
            }
        }

        // 2. Cushion Wall Collisions
        const minBound = 32;
        const maxBound = this.boardSize - 32;
        for (const body of allBodies) {
            if (!body) continue;
            if (body.x - body.radius < minBound) {
                body.x = minBound + body.radius;
                body.vx = -body.vx * 0.88;
                window.audioEngine.playCarromHit(1);
            }
            if (body.x + body.radius > maxBound) {
                body.x = maxBound - body.radius;
                body.vx = -body.vx * 0.88;
                window.audioEngine.playCarromHit(1);
            }
            if (body.y - body.radius < minBound) {
                body.y = minBound + body.radius;
                body.vy = -body.vy * 0.88;
                window.audioEngine.playCarromHit(1);
            }
            if (body.y + body.radius > maxBound) {
                body.y = maxBound - body.radius;
                body.vy = -body.vy * 0.88;
                window.audioEngine.playCarromHit(1);
            }
        }

        // 3. Elastic Ball-to-Ball Collisions
        for (let i = 0; i < allBodies.length; i++) {
            for (let j = i + 1; j < allBodies.length; j++) {
                const b1 = allBodies[i];
                const b2 = allBodies[j];
                if (!b1 || !b2) continue;

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist && dist > 0) {
                    // Normal vector
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Separate bodies to prevent overlap sticking
                    const overlap = minDist - dist;
                    b1.x -= nx * overlap * 0.5;
                    b1.y -= ny * overlap * 0.5;
                    b2.x += nx * overlap * 0.5;
                    b2.y += ny * overlap * 0.5;

                    // Elastic momentum resolution
                    const kx = b1.vx - b2.vx;
                    const ky = b1.vy - b2.vy;
                    const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

                    b1.vx -= p * b2.mass * nx * 0.95;
                    b1.vy -= p * b2.mass * ny * 0.95;
                    b2.vx += p * b1.mass * nx * 0.95;
                    b2.vy += p * b1.mass * ny * 0.95;

                    window.audioEngine.playCarromHit(Math.hypot(b1.vx, b1.vy));
                }
            }
        }

        // 4. Pocket checks
        let pocketedCoin = false;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            for (const pocket of this.pockets) {
                const dist = Math.hypot(coin.x - pocket.x, coin.y - pocket.y);
                if (dist < this.pocketRadius) {
                    // Coin pocketed!
                    window.audioEngine.playPocket();
                    pocketedCoin = true;
                    if (coin.type === 'queen') {
                        if (this.turn === 1) this.scores.p1 += 25;
                        else this.scores.p2 += 25;
                    } else if (coin.type === 'white') {
                        this.scores.p1 += 10;
                    } else {
                        this.scores.p2 += 10;
                    }
                    this.coins.splice(i, 1);
                    break;
                }
            }
        }

        // Check if striker pocketed (Foul)
        for (const pocket of this.pockets) {
            const dist = Math.hypot(this.striker.x - pocket.x, this.striker.y - pocket.y);
            if (dist < this.pocketRadius) {
                window.audioEngine.playPocket();
                if (this.turn === 1) this.scores.p1 = Math.max(0, this.scores.p1 - 5);
                else this.scores.p2 = Math.max(0, this.scores.p2 - 5);
                break;
            }
        }

        // Check if all stopped
        if (this.isMoving && !anyMoved) {
            this.isMoving = false;
            this.handleTurnEnd(pocketedCoin);
        }
    }

    handleTurnEnd(pocketedCoin) {
        // Win check
        if (this.coins.length === 0) {
            const winner = this.scores.p1 >= this.scores.p2 ? 'Player 1' : 'Player 2 / AI';
            window.hubManager.showGameOver({
                title: `${winner.toUpperCase()} VICTORIOUS!`,
                msg: `Final Score: Player 1: ${this.scores.p1} pts | Rival: ${this.scores.p2} pts`,
                xp: 200,
                coins: 80
            });
            return;
        }

        // If no coin was pocketed, switch turns
        if (!pocketedCoin) {
            this.turn = this.turn === 1 ? 2 : 1;
        }

        this.updateStrikerPosition();
        this.isAiming = true;
        this.updateHUD();

        if (this.turn === 2 && this.mode === 'ai') {
            setTimeout(() => this.makeAITurn(), 600);
        }
    }

    makeAITurn() {
        if (!this.isRunning || this.turn !== 2) return;

        // Smart Bot Logic: Find target coin and calculate striker angle
        const targetCoin = this.findBestAICoin();
        if (targetCoin) {
            const targetPocket = this.findNearestPocket(targetCoin);
            const dxP = targetPocket.x - targetCoin.x;
            const dyP = targetPocket.y - targetCoin.y;
            const angleToPocket = Math.atan2(dyP, dxP);

            // Ghost contact point behind coin
            const contactX = targetCoin.x - Math.cos(angleToPocket) * (targetCoin.radius + this.striker.radius);
            const contactY = targetCoin.y - Math.sin(angleToPocket) * (targetCoin.radius + this.striker.radius);

            // Set striker baseline position
            const normalizedBase = Math.max(0, Math.min(1, (contactX - 135) / (465 - 135)));
            this.strikerBasePos = normalizedBase;
            this.updateStrikerPosition();

            // Calculate aim angle from striker to ghost point
            let error = 0;
            if (this.difficulty === 'easy') error = (Math.random() - 0.5) * 0.35;
            if (this.difficulty === 'normal') error = (Math.random() - 0.5) * 0.12;

            this.aimAngle = Math.atan2(contactY - this.striker.y, contactX - this.striker.x) + error;
            this.power = this.difficulty === 'hard' ? 75 : 55;
            this.updatePowerHUD();

            setTimeout(() => this.fireStriker(), 400);
        } else {
            this.aimAngle = Math.PI / 2;
            this.power = 50;
            setTimeout(() => this.fireStriker(), 400);
        }
    }

    findBestAICoin() {
        const blackCoins = this.coins.filter(c => c.type === 'black');
        if (blackCoins.length > 0) {
            return blackCoins[Math.floor(Math.random() * blackCoins.length)];
        }
        return this.coins[0];
    }

    findNearestPocket(coin) {
        let nearest = this.pockets[0];
        let minDist = Infinity;
        for (const p of this.pockets) {
            const dist = Math.hypot(coin.x - p.x, coin.y - p.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        }
        return nearest;
    }

    draw() {
        const ctx = this.ctx;
        const s = this.boardSize;
        ctx.clearRect(0, 0, s, s);

        // 1. Luxury Carrom Wood Board Texture
        const woodGrad = ctx.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s * 0.7);
        woodGrad.addColorStop(0, '#f2d5a3');
        woodGrad.addColorStop(0.8, '#d9aa6a');
        woodGrad.addColorStop(1, '#b37d3f');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(0, 0, s, s);

        // Wooden Border Edge
        ctx.lineWidth = 28;
        ctx.strokeStyle = '#381c0f';
        ctx.strokeRect(14, 14, s - 28, s - 28);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#6b3e1f';
        ctx.strokeRect(28, 28, s - 56, s - 56);

        // 2. Corner Pockets
        for (const p of this.pockets) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.pocketRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#050505';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#222';
            ctx.stroke();
        }

        // 3. Baselines & Circles
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8a4b18';
        ctx.fillStyle = '#ff3366';

        // Baselines (Bottom, Top, Left, Right)
        ctx.strokeRect(135, 485, 330, 20);
        ctx.strokeRect(135, 95, 330, 20);
        ctx.strokeRect(95, 135, 20, 330);
        ctx.strokeRect(485, 135, 20, 330);

        // Baseline Circle Ends
        [135, 465].forEach(x => {
            [495, 105].forEach(y => {
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#c93b2b';
                ctx.fill();
                ctx.stroke();
            });
        });

        // Center concentric circles
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#c93b2b';
        ctx.fill();
        ctx.stroke();

        // 4. Trajectory Aim Guide (When aiming)
        if (this.isAiming && !this.isMoving) {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([6, 6]);
            ctx.moveTo(this.striker.x, this.striker.y);
            const lineLen = 160 + this.power * 2;
            const endX = this.striker.x + Math.cos(this.aimAngle) * lineLen;
            const endY = this.striker.y + Math.sin(this.aimAngle) * lineLen;
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = this.turn === 1 ? '#00f2fe' : '#f857a6';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Arrow head
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            ctx.fillStyle = this.turn === 1 ? '#00f2fe' : '#f857a6';
            ctx.fill();
            ctx.restore();
        }

        // 5. Draw Coins
        for (const coin of this.coins) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fillStyle = coin.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = coin.type === 'white' ? '#ddd' : (coin.type === 'queen' ? '#ffd700' : '#444');
            ctx.stroke();
            ctx.restore();
        }

        // 6. Draw Striker
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.striker.x, this.striker.y, this.striker.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.striker.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd700';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        // Striker center emblem
        ctx.beginPath();
        ctx.arc(this.striker.x, this.striker.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
    }

    updateHUD() {
        const p1Score = document.getElementById('carrom-p1-score');
        const p2Score = document.getElementById('carrom-p2-score');
        const p1Card = document.getElementById('carrom-p1-card');
        const p2Card = document.getElementById('carrom-p2-card');

        if (p1Score) p1Score.innerText = `${this.scores.p1} pts`;
        if (p2Score) p2Score.innerText = `${this.scores.p2} pts`;
        if (p1Card) p1Card.classList.toggle('active', this.turn === 1);
        if (p2Card) p2Card.classList.toggle('active', this.turn === 2);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.carromGame = new CarromGame();
