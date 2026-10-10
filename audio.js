/* ========================================================= */
/* VENOM AUDIO SYNTHESIZER ENGINE (Web Audio API)            */
/* 100% Self-Contained dynamic sound effects & ambient music */
/* ========================================================= */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.bgmEnabled = false;
        this.masterVolume = 0.8;
        this.bgmInterval = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    ensureContext() {
        if (!this.ctx) {
            this.initAudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createGain(val) {
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(val * this.masterVolume, this.ctx.currentTime);
        gain.connect(this.ctx.destination);
        return gain;
    }

    // UI Click Sound
    playClick() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.15);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // UI Hover Swoosh
    playHover() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.04);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.05);

        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // Subway Surfers Jump Swoosh
    playJump() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.2);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
    }

    // Subway Surfers Slide / Roll
    playSlide() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.18);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.18 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // Hoverboard Activate Sound
    playHoverboard() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        [300, 600, 900].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.15);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.05 + 0.15);
            osc.connect(gain);
            osc.start(this.ctx.currentTime + i * 0.05);
            osc.stop(this.ctx.currentTime + i * 0.05 + 0.15);
        });
    }

    // Magnet / Jetpack Powerup Sound
    playPowerup() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.18);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
            gain.gain.setValueAtTime(0.18 * this.masterVolume, this.ctx.currentTime + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.25);
            osc.connect(gain);
            osc.start(this.ctx.currentTime + idx * 0.07);
            osc.stop(this.ctx.currentTime + idx * 0.07 + 0.25);
        });
    }

    // Ninja Blade Swoosh Sound
    playBladeSwoosh() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.06);
        filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.12);

        const gain = this.createGain(0.2);
        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        noise.start();
    }

    // Fruit Juicy Splatter / Slice Sound
    playFruitSplatter() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.25);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // Combo Chime Fanfare
    playComboChime(multiplier = 3) {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const baseNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        const notesToPlay = baseNotes.slice(0, Math.min(5, multiplier));

        notesToPlay.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.18);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);

            gain.gain.setValueAtTime(0.18 * this.masterVolume, this.ctx.currentTime + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.22);

            osc.connect(gain);
            osc.start(this.ctx.currentTime + idx * 0.06);
            osc.stop(this.ctx.currentTime + idx * 0.06 + 0.22);
        });
    }

    // Laser Sci-Fi (Tic Tac Toe mark)
    playLaser() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.2);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // Car Engine Rev
    playEngine(pitch = 1, isNitro = false) {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(isNitro ? 0.25 : 0.12);
        osc.type = isNitro ? 'sawtooth' : 'triangle';
        
        const baseFreq = isNitro ? 160 * pitch : 90 * pitch;
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.15, this.ctx.currentTime + 0.1);

        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    // Crash / Explosion
    playCrash() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);

        const gain = this.createGain(0.4);
        gain.gain.setValueAtTime(0.4 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        noise.start();
    }

    // Coin Pick Crystal Ding
    playCoin() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const notes = [987.77, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.18);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

            gain.gain.setValueAtTime(0.18 * this.masterVolume, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.25);

            osc.connect(gain);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.25);
        });
    }

    // Carrom Wooden Knock Hit
    playCarromHit(velocity = 1) {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const volume = Math.min(0.4, Math.max(0.05, velocity * 0.08));
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(volume);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.06);
    }

    // Pocket Fall Thud
    playPocket() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.3);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
    }

    // Pool Ball Clack
    playPoolCrack(speed = 1) {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const vol = Math.min(0.45, Math.max(0.06, speed * 0.1));
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(vol);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(vol * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
    }

    // 3D Dice Roll Sound
    playDiceRoll() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.createGain(0.12 - i * 0.02);
                osc.type = 'square';
                osc.frequency.setValueAtTime(280 + Math.random() * 200, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
                osc.connect(gain);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.04);
            }, i * 70);
        }
    }

    // Token Step Pop (Ludo)
    playTokenMove() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.15);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.08);

        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // Chess Move Wooden Slide
    playChessMove() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.2);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.07);

        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.07);
    }

    // Check Alarm Alert
    playCheckAlert() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        [440, 466.16].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.2);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.2);
            osc.connect(gain);
            osc.start(this.ctx.currentTime + i * 0.12);
            osc.stop(this.ctx.currentTime + i * 0.12 + 0.2);
        });
    }

    // Victory Fanfare
    playWinFanfare() {
        if (!this.sfxEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const chordNotes = [523.25, 659.25, 783.99, 1046.50];
        chordNotes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.22);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.22 * this.masterVolume, this.ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 0.6);
            osc.connect(gain);
            osc.start(this.ctx.currentTime + idx * 0.12);
            osc.stop(this.ctx.currentTime + idx * 0.12 + 0.6);
        });
    }

    // Cyberpunk Ambient BGM Synthesizer
    toggleBGM(enable) {
        this.bgmEnabled = enable !== undefined ? enable : !this.bgmEnabled;
        if (this.bgmEnabled) {
            this.startBGM();
        } else {
            this.stopBGM();
        }
        return this.bgmEnabled;
    }

    startBGM() {
        this.stopBGM();
        this.ensureContext();
        if (!this.ctx) return;

        const chordProgression = [
            [130.81, 196.00, 246.94],
            [110.00, 164.81, 220.00],
            [146.83, 220.00, 293.66],
            [98.00, 146.83, 196.00]
        ];

        let step = 0;
        const playChord = () => {
            if (!this.bgmEnabled || !this.ctx) return;
            const chord = chordProgression[step % chordProgression.length];
            step++;

            chord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.createGain(0.035);
                const filter = this.ctx.createBiquadFilter();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.035 * this.masterVolume, this.ctx.currentTime + 0.8);
                gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 3.6);

                osc.connect(filter);
                filter.connect(gain);
                osc.start();
                osc.stop(this.ctx.currentTime + 3.8);
            });
        };

        playChord();
        this.bgmInterval = setInterval(playChord, 3800);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

// Global Audio Singleton
window.audioEngine = new SoundEngine();
