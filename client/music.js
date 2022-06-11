
const octave4 = [
    ['C', 261.6255653005986],
    ['Db', 277.1826309768721],
    ['D', 293.6647679174076],
    ['Eb', 311.12698372208087],
    ['E', 329.6275569128699],
    ['F', 349.2282314330039],
    ['Gb', 369.99442271163446],
    ['G', 391.99543598174927],
    ['Ab', 415.3046975799451],
    ['A', 440],
    ['Bb', 466.1637615180899],
    ['B', 493.8833012561241]
];
class Music {
    static notes = [
        ...octave4.map(x=>Object({name: x[0]+'2', frequency: x[1]*(2**-2)})),
        ...octave4.map(x=>Object({name: x[0]+'3', frequency: x[1]*(2**-1)})),
        ...octave4.map(x=>Object({name: x[0]+'4', frequency: x[1]*(2**0)})),
        ...octave4.map(x=>Object({name: x[0]+'5', frequency: x[1]*(2**1)})),
        ...octave4.map(x=>Object({name: x[0]+'6', frequency: x[1]*(2**2)})),
    ]
}

class MusicalInstrument {
    static defaults = {
        gain: 0.2,
        type: 'sine',
        notes: Music.notes,
    }
    constructor(ctx, options={}) {
        this.ctx = ctx;
        this._options = options;
        this.options = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target._options) return target._options[prop];
                return MusicalInstrument.defaults[prop];
            },
            set(target, prop, value, receiver) {
                return target._options[prop] = value;
            }
        });
        this.notePlayers = {};
        this.gain = ctx.createGain();
        this.gain.gain.setValueAtTime(this.options.gain, ctx.currentTime);
        this.gain.connect(options.destination || ctx.destination);
    }
    setGainAtTime(value, time=this.ctx.currentTime) {
        this.gain.gain.setValueAtTime(value, time);
    }
    setSpectrumAtTime(spectrum, time=this.ctx.currentTime) {
        spectrum.forEach((dB,i)=>{
            let dBTruncate = -80;
            if ((dB > dBTruncate) && !(i in this.notePlayers)) {
                this.notePlayers[i] = new MusicalNote(this.ctx, {
                    destination: this.gain,
                    frequency: this.options.notes[i].frequency,
                    gain: 0,
                    wave: this.options.wave,
                    type: this.options.type,
                });
                this.notePlayers[i].start();
            }
            if (!(i in this.notePlayers)) return;
            if (dB < dBTruncate) dB = -100;
            this.notePlayers[i].setGainAtTime((dB+100)/100, time);
        });
    }
}

class MusicalNote {
    static defaults = {
        gain: 0.2,
        frequency: 440,
        type: 'sine',
    }
    // todo: support note overtones
    constructor(ctx, options={}) {
        this.ctx = ctx;
        this._options = options;
        this.options = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target._options) return target._options[prop];
                return MusicalNote.defaults[prop];
            },
            set(target, prop, value, receiver) {
                return target._options[prop] = value;
            }
        });
        this.gain = ctx.createGain();
        this.gain.gain.setValueAtTime(this.options.gain, ctx.currentTime);
        this.gain.connect(options.destination || ctx.destination);
    }
    setGainAtTime(value, time=this.ctx.currentTime) {
        this.gain.gain.setValueAtTime(value, time);
    }
    start() {
        this.stop();
        this.osc = this.ctx.createOscillator();
        if (this.options.wave) {
            this.osc.setPeriodicWave(this.options.wave);
        } else {
            this.osc.type = this.options.type;
        };
        this.osc.frequency.setValueAtTime(this.options.frequency, this.ctx.currentTime);
        this.unmute();
        this.osc.start();
    }
    stop() {
        if (!this.osc) return;
        this.osc.stop();
        delete this.osc;
    }
    mute() {
        this.osc.disconnect();
        this.muted = true;
    }
    unmute() {
        this.osc.connect(this.gain);
        this.muted = false;
    }
}
