/* ========================================================= */
/* GAME 4: 8-BALL LUXURY NEON POOL BILLIARDS ENGINE          */
/* Full 16-Ball Physics, Ghost Aiming Guide & Bot AI        */
/* ========================================================= */

class PoolGame {
    constructor() {
        this.canvas = document.getElementById('pool-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 440;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.isRunning = false;
        this.isMoving = false;
        this.mode = 'ai';
        this.difficulty = 'normal';
        this.turn = 1; // 1 = Player 1, 2 = AI / Player 2

        // Pockets: 4 corners + 2 center sides
        this.pocketRadius = 22;
        this.pockets = [
            { x: 38, y: 38 },
            { x: 400, y: 32 },
            { x: 762, y: 38 },
            { x: 38, y: 402 },
            { x: 400, y: 408 },
            { x: 762, y: 402 }
        ];

        this.friction = 0.988;
        this.ballRadius = 11;
        this.balls = [];
        this.cueBall = null;

        // Player Groups: 'unassigned', 'solids', 'stripes'
        this.p1Group = 'unassigned';
        this.p2Group = 'unassigned';

        // Cue Stick & Aim
        this.cueAngle = 0;
        this.power = 45;
        this.isAiming = true;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const powerSlider = document.getElementById('pool-power-slider');
        if (powerSlider) {
            powerSlider.addEventListener('input', (e) => {
                this.power = parseFloat(e.target.value);
            });
        }

        const shootBtn = document.getElementById('btn-pool-shoot');
        if (shootBtn) {
            shootBtn.addEventListener('click', () => {
                if (this.isAiming && !this.isMoving) {
                    this.shootCueBall();
                }
            });
        }

        // Mouse / Touch Aiming
        let isAimDragging = false;
        const getCanvasCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            return {
                x: (clientX - rect.left) * (this.width / rect.width),
                y: (clientY - rect.top) * (this.height / rect.height)
            };
        };

        const onPointerDown = (e) => {
            if (!this.isAiming || this.isMoving || !this.cueBall) return;
            const pt = getCanvasCoords(e);
            const dx = pt.x - this.cueBall.x;
            const dy = pt.y - this.cueBall.y;
            this.cueAngle = Math.atan2(dy, dx);
            isAimDragging = true;
        };

        const onPointerMove = (e) => {
            if (!isAimDragging || !this.cueBall) return;
            const pt = getCanvasCoords(e);
            const dx = pt.x - this.cueBall.x;
            const dy = pt.y - this.cueBall.y;
            this.cueAngle = Math.atan2(dy, dx);
        };

        const onPointerUp = () => {
            isAimDragging = false;
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
        this.turn = 1;
        this.p1Group = 'unassigned';
        this.p2Group = 'unassigned';
        this.resetRack();
        this.isRunning = true;
        this.loop();
    }

    resetRack() {
        this.balls = [];
        const r = this.ballRadius;

        // Cue Ball
        this.cueBall = {
            id: 0,
            x: 220,
            y: this.height / 2,
            vx: 0,
            vy: 0,
            radius: r,
            color: '#ffffff',
            type: 'cue'
        };
        this.balls.push(this.cueBall);

        // Rack Triangle (Apex at x = 560, y = center)
        const startX = 560;
        const startY = this.height / 2;
        const ballColors = [
            '#f8d800', '#00f2fe', '#ff3366', '#9b51e0', '#ff7e40', '#00f5a0', '#9b111e', // Solids 1-7
            '#111111', // 8-Ball
            '#f8d800', '#00f2fe', '#ff3366', '#9b51e0', '#ff7e40', '#00f5a0', '#9b111e'  // Stripes 9-15
        ];

        let ballIndex = 0;
        const rowOffsets = [0, 1, 2, 3, 4];

        for (let col = 0; col < 5; col++) {
            const count = col + 1;
            const colX = startX + col * (r * 1.75);
            const topY = startY - (count - 1) * r;

            for (let row = 0; row < count; row++) {
                const bY = topY + row * (r * 2.05);
                const id = ballIndex + 1;
                const isEightBall = col === 2 && row === 1;
                const type = isEightBall ? 'eight' : (id <= 7 ? 'solid' : 'stripe');
                const color = isEightBall ? '#111111' : ballColors[ballIndex];

                this.balls.push({
                    id: id,
                    x: colX,
                    y: bY,
                    vx: 0,
                    vy: 0,
                    radius: r,
                    color: color,
                    type: type
                });
                ballIndex++;
            }
        }

        this.cueAngle = 0;
        this.isAiming = true;
        this.isMoving = false;
        this.updateHUD();
    }

    shootCueBall() {
        if (!this.cueBall) return;
        const force = (this.power / 100) * 24;
        this.cueBall.vx = Math.cos(this.cueAngle) * force;
        this.cueBall.vy = Math.sin(this.cueAngle) * force;
        this.isAiming = false;
        this.isMoving = true;
        window.audioEngine.playPoolCrack(this.power / 10);
    }

    update() {
        if (!this.isRunning) return;

        let anyMoved = false;

        // 1. Movement & Friction
        for (const b of this.balls) {
            const speed = Math.hypot(b.vx, b.vy);
            if (speed > 0.04) {
                anyMoved = true;
                b.x += b.vx;
                b.y += b.vy;
                b.vx *= this.friction;
                b.vy *= this.friction;
            } else {
                b.vx = 0;
                b.vy = 0;
            }
        }

        // 2. Table Cushion Bounces
        const minX = 40;
        const maxX = this.width - 40;
        const minY = 40;
        const maxY = this.height - 40;

        for (const b of this.balls) {
            if (b.x - b.radius < minX) {
                b.x = minX + b.radius;
                b.vx = -b.vx * 0.85;
                window.audioEngine.playPoolCrack(0.5);
            }
            if (b.x + b.radius > maxX) {
                b.x = maxX - b.radius;
                b.vx = -b.vx * 0.85;
                window.audioEngine.playPoolCrack(0.5);
            }
            if (b.y - b.radius < minY) {
                b.y = minY + b.radius;
                b.vy = -b.vy * 0.85;
                window.audioEngine.playPoolCrack(0.5);
            }
            if (b.y + b.radius > maxY) {
                b.y = maxY - b.radius;
                b.vy = -b.vy * 0.85;
                window.audioEngine.playPoolCrack(0.5);
            }
        }

        // 3. Ball-to-Ball Collisions
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                const b1 = this.balls[i];
                const b2 = this.balls[j];
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = minDist - dist;
                    b1.x -= nx * overlap * 0.5;
                    b1.y -= ny * overlap * 0.5;
                    b2.x += nx * overlap * 0.5;
                    b2.y += ny * overlap * 0.5;

                    const kx = b1.vx - b2.vx;
                    const ky = b1.vy - b2.vy;
                    const p = 2 * (nx * kx + ny * ky) / 2;

                    b1.vx -= p * nx * 0.98;
                    b1.vy -= p * ny * 0.98;
                    b2.vx += p * nx * 0.98;
                    b2.vy += p * ny * 0.98;

                    window.audioEngine.playPoolCrack(Math.hypot(b1.vx, b1.vy));
                }
            }
        }

        // 4. Pocket checks
        let pocketedAny = false;
        let pocketedCue = false;
        let pocketedEight = false;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            for (const p of this.pockets) {
                const dist = Math.hypot(b.x - p.x, b.y - p.y);
                if (dist < this.pocketRadius) {
                    window.audioEngine.playPocket();
                    if (b.type === 'cue') {
                        pocketedCue = true;
                    } else if (b.type === 'eight') {
                        pocketedEight = true;
                    } else {
                        pocketedAny = true;
                        if (this.p1Group === 'unassigned') {
                            this.p1Group = this.turn === 1 ? (b.type === 'solid' ? 'solids' : 'stripes') : (b.type === 'solid' ? 'stripes' : 'solids');
                            this.p2Group = this.p1Group === 'solids' ? 'stripes' : 'solids';
                        }
                    }
                    this.balls.splice(i, 1);
                    break;
                }
            }
        }

        // Check if movement stopped
        if (this.isMoving && !anyMoved) {
            this.isMoving = false;
            this.handleTurnEnd(pocketedAny, pocketedCue, pocketedEight);
        }
    }

    handleTurnEnd(pocketedAny, pocketedCue, pocketedEight) {
        // Handle Cue ball scratch
        if (pocketedCue) {
            this.cueBall = {
                id: 0,
                x: 220,
                y: this.height / 2,
                vx: 0,
                vy: 0,
                radius: this.ballRadius,
                color: '#ffffff',
                type: 'cue'
            };
            this.balls.unshift(this.cueBall);
            this.turn = this.turn === 1 ? 2 : 1;
        } else if (pocketedEight) {
            // Check 8-ball win/loss
            const winner = this.turn === 1 ? 'Player 1' : 'AI / Player 2';
            window.hubManager.showGameOver({
                title: `${winner.toUpperCase()} CONQUERS THE TABLE!`,
                msg: "8-Ball sunk into the pocket for a glorious win!",
                xp: 250,
                coins: 100
            });
            return;
        } else if (!pocketedAny) {
            this.turn = this.turn === 1 ? 2 : 1;
        }

        this.isAiming = true;
        this.updateHUD();

        if (this.turn === 2 && this.mode === 'ai') {
            setTimeout(() => this.makeAITurn(), 650);
        }
    }

    makeAITurn() {
        if (!this.isRunning || this.turn !== 2 || !this.cueBall) return;

        // Smart Bot targeting
        const targetBall = this.balls.find(b => b.type !== 'cue');
        if (targetBall) {
            const dx = targetBall.x - this.cueBall.x;
            const dy = targetBall.y - this.cueBall.y;
            let error = 0;
            if (this.difficulty === 'easy') error = (Math.random() - 0.5) * 0.25;
            if (this.difficulty === 'normal') error = (Math.random() - 0.5) * 0.08;

            this.cueAngle = Math.atan2(dy, dx) + error;
            this.power = this.difficulty === 'hard' ? 70 : 50;

            const slider = document.getElementById('pool-power-slider');
            if (slider) slider.value = this.power;

            setTimeout(() => this.shootCueBall(), 450);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Table Felt Green Velvet Surface
        const feltGrad = ctx.createRadialGradient(this.width / 2, this.height / 2, 50, this.width / 2, this.height / 2, 450);
        feltGrad.addColorStop(0, '#0d5c36');
        feltGrad.addColorStop(0.8, '#083d23');
        feltGrad.addColorStop(1, '#052917');
        ctx.fillStyle = feltGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Wooden Cushion Rails
        ctx.lineWidth = 32;
        ctx.strokeStyle = '#2b1a11';
        ctx.strokeRect(16, 16, this.width - 32, this.height - 32);

        // Gold Trim Border
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffd700';
        ctx.strokeRect(32, 32, this.width - 64, this.height - 64);

        // 2. Corner & Side Pockets
        for (const p of this.pockets) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.pocketRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#555';
            ctx.stroke();
        }

        // 3. Ghost Aiming Guide Line & Cue Stick
        if (this.isAiming && !this.isMoving && this.cueBall) {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(this.cueBall.x, this.cueBall.y);
            const aimDist = 280;
            const targetX = this.cueBall.x + Math.cos(this.cueAngle) * aimDist;
            const targetY = this.cueBall.y + Math.sin(this.cueAngle) * aimDist;
            ctx.lineTo(targetX, targetY);
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Cue Stick
            ctx.setLineDash([]);
            const cuePullback = 20 + this.power * 0.4;
            const cueStartX = this.cueBall.x - Math.cos(this.cueAngle) * (cuePullback + 150);
            const cueStartY = this.cueBall.y - Math.sin(this.cueAngle) * (cuePullback + 150);
            const cueEndX = this.cueBall.x - Math.cos(this.cueAngle) * cuePullback;
            const cueEndY = this.cueBall.y - Math.sin(this.cueAngle) * cuePullback;

            ctx.beginPath();
            ctx.moveTo(cueStartX, cueStartY);
            ctx.lineTo(cueEndX, cueEndY);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#d4a373';
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cueEndX - Math.cos(this.cueAngle) * 15, cueEndY - Math.sin(this.cueAngle) * 15);
            ctx.lineTo(cueEndX, cueEndY);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#00f2fe';
            ctx.stroke();

            ctx.restore();
        }

        // 4. Draw Balls
        for (const b of this.balls) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.fill();

            // Ball Shine Highlight
            ctx.beginPath();
            ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();

            // Stripes white center band
            if (b.type === 'stripe') {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            // Ball Number
            if (b.id > 0) {
                ctx.fillStyle = b.type === 'eight' ? '#fff' : '#000';
                ctx.font = 'bold 8px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.id, b.x, b.y);
            }

            ctx.restore();
        }
    }

    updateHUD() {
        const p1Card = document.getElementById('pool-p1-card');
        const p2Card = document.getElementById('pool-p2-card');
        const p1Suit = document.getElementById('pool-p1-suit');
        const p2Suit = document.getElementById('pool-p2-suit');
        const statusMsg = document.getElementById('pool-status-msg');

        if (p1Card) p1Card.classList.toggle('active', this.turn === 1);
        if (p2Card) p2Card.classList.toggle('active', this.turn === 2);
        if (p1Suit) p1Suit.innerText = `Suit: ${this.p1Group.toUpperCase()}`;
        if (p2Suit) p2Suit.innerText = `Suit: ${this.p2Group.toUpperCase()}`;
        if (statusMsg) statusMsg.innerText = `${this.turn === 1 ? 'Player 1' : 'Opponent'}'s Turn`;
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.poolGame = new PoolGame();
