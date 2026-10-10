/* ========================================================= */
/* GAME 7: CYBER FRUIT NINJA MASTER ENGINE                   */
/* Slicing Physics, Blade Trails, Splatters, Combos & AI    */
/* ========================================================= */

class FruitNinjaGame {
    constructor() {
        this.canvas = document.getElementById('ninja-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 500;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.isRunning = false;
        this.isPaused = false;
        this.mode = 'ai';
        this.difficulty = 'normal';

        this.score = 0;
        this.strikes = 0;
        this.maxStrikes = 3;

        // Fruits & Objects in air
        this.fruits = [];
        this.slicedHalves = [];
        this.particles = [];
        this.splatters = [];

        // Blade Swipe Trail
        this.bladeTrail = [];
        this.isSwiping = false;
        this.lastSwipePoint = null;
        this.currentComboCount = 0;
        this.comboTimer = null;

        // Slow Mo State
        this.timeScale = 1.0;
        this.slowMoTimer = null;

        // Fruit Definitions
        this.fruitTypes = [
            { name: 'watermelon', emoji: '🍉', radius: 34, color: '#ff3366', points: 10 },
            { name: 'orange', emoji: '🍊', radius: 28, color: '#ff7e40', points: 10 },
            { name: 'apple', emoji: '🍎', radius: 28, color: '#ff3366', points: 10 },
            { name: 'banana', emoji: '🍌', radius: 30, color: '#f8d800', points: 15, power: 'freeze' },
            { name: 'strawberry', emoji: '🍓', radius: 24, color: '#ff3366', points: 10 },
            { name: 'pineapple', emoji: '🍍', radius: 32, color: '#f8d800', points: 20 },
            { name: 'coconut', emoji: '🥥', radius: 28, color: '#ffffff', points: 15 }
        ];

        this.setupEventListeners();
    }

    setupEventListeners() {
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
            if (!this.isRunning || this.isPaused) return;
            this.isSwiping = true;
            const pt = getCanvasCoords(e);
            this.lastSwipePoint = pt;
            this.bladeTrail = [pt];
            this.currentComboCount = 0;
        };

        const onPointerMove = (e) => {
            if (!this.isSwiping || !this.isRunning) return;
            const pt = getCanvasCoords(e);
            this.bladeTrail.push(pt);
            if (this.bladeTrail.length > 12) this.bladeTrail.shift();

            if (this.lastSwipePoint) {
                this.checkBladeSlice(this.lastSwipePoint, pt);
            }
            this.lastSwipePoint = pt;
        };

        const onPointerUp = () => {
            this.isSwiping = false;
            this.lastSwipePoint = null;
            if (this.currentComboCount >= 3) {
                this.showCombo(this.currentComboCount);
            }
            this.currentComboCount = 0;
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
        this.score = 0;
        this.strikes = 0;
        this.fruits = [];
        this.slicedHalves = [];
        this.particles = [];
        this.splatters = [];
        this.bladeTrail = [];
        this.timeScale = 1.0;
        this.isRunning = true;
        this.isPaused = false;

        this.updateHUD();
        this.loop();
    }

    spawnFruitBatch() {
        if (!this.isRunning || this.isPaused) return;

        let count = 1;
        if (this.difficulty === 'normal') count = Math.floor(Math.random() * 2) + 1;
        if (this.difficulty === 'hard') count = Math.floor(Math.random() * 3) + 2;

        for (let i = 0; i < count; i++) {
            const isBomb = Math.random() > (this.difficulty === 'hard' ? 0.7 : 0.85);

            const startX = 100 + Math.random() * (this.width - 200);
            const targetX = this.width / 2 + (Math.random() - 0.5) * 300;
            const vx = (targetX - startX) * 0.025;
            const vy = -(13 + Math.random() * 4);

            if (isBomb) {
                this.fruits.push({
                    id: Math.random(),
                    type: 'bomb',
                    emoji: '💣',
                    x: startX,
                    y: this.height + 40,
                    vx: vx,
                    vy: vy,
                    radius: 26,
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.08,
                    sliced: false
                });
            } else {
                const fType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
                this.fruits.push({
                    id: Math.random(),
                    type: 'fruit',
                    name: fType.name,
                    emoji: fType.emoji,
                    radius: fType.radius,
                    color: fType.color,
                    points: fType.points,
                    power: fType.power,
                    x: startX,
                    y: this.height + 40,
                    vx: vx,
                    vy: vy,
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.1,
                    sliced: false
                });
            }
        }
    }

    checkBladeSlice(p1, p2) {
        window.audioEngine.playBladeSwoosh();

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            if (fruit.sliced) continue;

            const distToSegment = this.distToSegment(fruit.x, fruit.y, p1.x, p1.y, p2.x, p2.y);

            if (distToSegment < fruit.radius + 10) {
                // Slice Hit!
                fruit.sliced = true;

                if (fruit.type === 'bomb') {
                    // Bomb Sliced -> Explosion & Game Over
                    window.audioEngine.playCrash();
                    this.createExplosion(fruit.x, fruit.y);
                    this.gameOver("BOMB SLICED!");
                    return;
                } else {
                    // Fruit Sliced
                    window.audioEngine.playFruitSplatter();
                    this.score += fruit.points;
                    this.currentComboCount++;

                    // Special Powerup check
                    if (fruit.power === 'freeze') {
                        this.triggerSlowMo();
                    }

                    this.sliceFruit(fruit, p1, p2);
                    this.fruits.splice(i, 1);
                }
            }
        }
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    sliceFruit(fruit, p1, p2) {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        // Spawn 2 flying halves
        this.slicedHalves.push({
            emoji: fruit.emoji,
            x: fruit.x,
            y: fruit.y,
            vx: fruit.vx - Math.cos(angle + Math.PI / 2) * 4,
            vy: fruit.vy - 3,
            rotation: fruit.rotation,
            rotSpeed: -0.12,
            radius: fruit.radius * 0.8
        });

        this.slicedHalves.push({
            emoji: fruit.emoji,
            x: fruit.x,
            y: fruit.y,
            vx: fruit.vx + Math.cos(angle + Math.PI / 2) * 4,
            vy: fruit.vy - 3,
            rotation: fruit.rotation,
            rotSpeed: 0.12,
            radius: fruit.radius * 0.8
        });

        // Juice Splatter Decal on board
        this.splatters.push({
            x: fruit.x,
            y: fruit.y,
            radius: fruit.radius * 1.5,
            color: fruit.color,
            alpha: 0.8
        });

        // Splatter Particles
        for (let k = 0; k < 18; k++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 8 + 3;
            this.particles.push({
                x: fruit.x,
                y: fruit.y,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                color: fruit.color,
                radius: Math.random() * 4 + 2,
                alpha: 1,
                decay: 0.02
            });
        }
    }

    createExplosion(x, y) {
        for (let k = 0; k < 50; k++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 15 + 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                color: Math.random() > 0.5 ? '#ff3366' : '#ffd700',
                radius: Math.random() * 6 + 3,
                alpha: 1,
                decay: 0.025
            });
        }
    }

    triggerSlowMo() {
        this.timeScale = 0.4;
        const wrapper = document.querySelector('.ninja-arena-wrapper');
        if (wrapper) wrapper.classList.add('slowmo-active');

        if (this.slowMoTimer) clearTimeout(this.slowMoTimer);
        this.slowMoTimer = setTimeout(() => {
            this.timeScale = 1.0;
            if (wrapper) wrapper.classList.remove('slowmo-active');
        }, 5000);
    }

    showCombo(count) {
        window.audioEngine.playComboChime(count);
        const comboBanner = document.getElementById('ninja-combo-text');
        if (comboBanner) {
            comboBanner.innerText = `🔥 ${count}X COMBO! +${count * 10} PTS`;
            comboBanner.classList.add('active');
            this.score += count * 10;
            setTimeout(() => comboBanner.classList.remove('active'), 1200);
        }
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        const gravity = 0.38 * this.timeScale;

        // 1. Update Fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.x += f.vx * this.timeScale;
            f.y += f.vy * this.timeScale;
            f.vy += gravity;
            f.rotation += f.rotSpeed * this.timeScale;

            // Missed fruit (Fell off bottom without being sliced)
            if (f.y > this.height + 60 && f.vy > 0) {
                if (f.type === 'fruit') {
                    this.strikes++;
                    this.updateStrikesHUD();
                    if (this.strikes >= this.maxStrikes) {
                        this.gameOver("3 FRUITS MISSED!");
                        return;
                    }
                }
                this.fruits.splice(i, 1);
            }
        }

        // 2. Update Sliced Halves
        for (let i = this.slicedHalves.length - 1; i >= 0; i--) {
            const h = this.slicedHalves[i];
            h.x += h.vx * this.timeScale;
            h.y += h.vy * this.timeScale;
            h.vy += gravity * 1.2;
            h.rotation += h.rotSpeed * this.timeScale;

            if (h.y > this.height + 80) {
                this.slicedHalves.splice(i, 1);
            }
        }

        // 3. Update Splatter Decals & Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * this.timeScale;
            p.y += p.vy * this.timeScale;
            p.vy += gravity * 0.5;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 4. Batch spawner interval
        if (Math.random() < (this.difficulty === 'hard' ? 0.04 : 0.025) && this.fruits.length < 7) {
            this.spawnFruitBatch();
        }

        this.updateHUD();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Luxury Dojo Wooden Texture
        const wood = ctx.createLinearGradient(0, 0, w, h);
        wood.addColorStop(0, '#1f140e');
        wood.addColorStop(0.5, '#2e1c13');
        wood.addColorStop(1, '#150d09');
        ctx.fillStyle = wood;
        ctx.fillRect(0, 0, w, h);

        // Dojo Wall Planks
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        for (let y = 60; y < h; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 2. Splatter Decals on wall
        this.splatters.forEach(s => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha * 0.35;
            ctx.fill();
            ctx.restore();
        });

        // 3. Draw Sliced Halves
        this.slicedHalves.forEach(h => {
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.rotation);
            ctx.font = `${h.radius * 1.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(h.emoji, 0, 0);
            ctx.restore();
        });

        // 4. Draw Fruits & Bombs
        this.fruits.forEach(f => {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);

            // Glow around fruit
            ctx.shadowBlur = 15;
            ctx.shadowColor = f.type === 'bomb' ? '#ff3366' : '#ffd700';

            ctx.font = `${f.radius * 1.6}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.emoji, 0, 0);

            // Spark fuse on bomb
            if (f.type === 'bomb') {
                ctx.fillStyle = '#ff7e40';
                ctx.beginPath();
                ctx.arc(10, -20, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        // 5. Draw Particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
        });

        // 6. Draw Glowing Katana Blade Swipe Trail
        if (this.bladeTrail.length > 1) {
            ctx.save();
            for (let i = 1; i < this.bladeTrail.length; i++) {
                const pPrev = this.bladeTrail[i - 1];
                const pCurr = this.bladeTrail[i];
                const ratio = i / this.bladeTrail.length;

                ctx.beginPath();
                ctx.moveTo(pPrev.x, pPrev.y);
                ctx.lineTo(pCurr.x, pCurr.y);
                ctx.strokeStyle = '#00f2fe';
                ctx.lineWidth = ratio * 8;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#00f2fe';
                ctx.stroke();

                // Inner core white laser
                ctx.beginPath();
                ctx.moveTo(pPrev.x, pPrev.y);
                ctx.lineTo(pCurr.x, pCurr.y);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = ratio * 3;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    updateHUD() {
        const scoreEl = document.getElementById('ninja-score-val');
        if (scoreEl) scoreEl.innerText = this.score;
    }

    updateStrikesHUD() {
        const crosses = document.querySelectorAll('.strike-cross');
        crosses.forEach((cross, idx) => {
            cross.classList.toggle('active', idx < this.strikes);
        });
    }

    gameOver(reason) {
        this.isRunning = false;
        window.audioEngine.playWinFanfare();
        window.particleEngine.triggerConfetti();

        window.hubManager.showGameOver({
            title: "NINJA DOJO COMPLETE!",
            msg: `${reason} Final Blade Score: ${this.score} pts!`,
            xp: Math.floor(this.score * 0.8) + 100,
            coins: Math.floor(this.score * 0.4) + 40
        });
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    pause() {
        this.isPaused = !this.isPaused;
    }

    destroy() {
        this.isRunning = false;
    }
}

window.fruitNinjaGame = new FruitNinjaGame();
