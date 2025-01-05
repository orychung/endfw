(()=>{
  const RAMP_SHARP_GAP = 0.005;
  const ZERO_GAIN_PAD = 0.0001;
  const OCTAVE4 = [
    ['C', 261.6255653005986],
    ['D♭', 277.1826309768721],
    ['D', 293.6647679174076],
    ['E♭', 311.12698372208087],
    ['E', 329.6275569128699],
    ['F', 349.2282314330039],
    ['G♭', 369.99442271163446],
    ['G', 391.99543598174927],
    ['A♭', 415.3046975799451],
    ['A', 440],
    ['B♭', 466.1637615180899],
    ['B', 493.8833012561241]
  ];
  class Music {
    static notes = [
      ...OCTAVE4.map(x=>Object({name: x[0]+'2', frequency: x[1]*(2**-2)})),
      ...OCTAVE4.map(x=>Object({name: x[0]+'3', frequency: x[1]*(2**-1)})),
      ...OCTAVE4.map(x=>Object({name: x[0]+'4', frequency: x[1]*(2**0)})),
      ...OCTAVE4.map(x=>Object({name: x[0]+'5', frequency: x[1]*(2**1)})),
      ...OCTAVE4.map(x=>Object({name: x[0]+'6', frequency: x[1]*(2**2)})),
      ...OCTAVE4.map(x=>Object({name: x[0]+'7', frequency: x[1]*(2**3)})),
    ]
    static keySignatures = [
      {majorName: "C Major", minorName: "A Minor", doNote: 0, missingNotes: "1,3,6,8,10"},
      {majorName: "D♭ Major", minorName: "B♭ Minor", doNote: 1, missingNotes: "2,4,7,9,11"},
      {majorName: "D Major", minorName: "B Minor", doNote: 2, missingNotes: "0,3,5,8,10"},
      {majorName: "E♭ Major", minorName: "C Minor", doNote: 3, missingNotes: "1,4,6,9,11"},
      {majorName: "E Major", minorName: "D♭ Minor", doNote: 4, missingNotes: "0,2,5,7,10"},
      {majorName: "F Major", minorName: "D Minor", doNote: 5, missingNotes: "1,3,6,8,11"},
      {majorName: "G♭ Major", minorName: "E♭ Minor", doNote: 6, missingNotes: "0,2,4,7,9"},
      {majorName: "G Major", minorName: "E Minor", doNote: 7, missingNotes: "1,3,5,8,10"},
      {majorName: "A♭ Major", minorName: "F Minor", doNote: 8, missingNotes: "2,4,6,9,11"},
      {majorName: "A Major", minorName: "G♭ Minor", doNote: 9, missingNotes: "0,3,5,7,10"},
      {majorName: "B♭ Major", minorName: "G Minor", doNote: 10, missingNotes: "1,4,6,8,11"},
      {majorName: "B Major", minorName: "A♭ Minor", doNote: 11, missingNotes: "0,2,5,7,9"},
    ]
    static timeDisplay(time) {
      let date = new Date(time * 1000);
      return date.getMinutes()+':'+date.getSeconds().toString().padStart(2,'0');
    }
  }

  class MusicalItem extends EventTarget {
    static defaults = {
      gain: 0.3,
      frequency: 440,
      type: 'sine',
      notes: Music.notes,
    }
    constructor(ctx, options={}) {
      super();
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
      this.gain.gain.exponentialRampToValueAtTime(this.options.gain+ZERO_GAIN_PAD, ctx.currentTime+RAMP_SHARP_GAP);
      this.analyser = this.gain;
    }
    get gainValue() {
      return this.options.gain;
    }
    set gainValue(value) {
      this.options.gain = value;
      this.setGainAtTime(value);
    }
    useAnalyser(options={}) {
      if (this.analyser != this.gain) this.analyser.disconnect();
      this.analyser = this.ctx.createAnalyser();
      Object.assign(this.analyser, options);
      this.analyser.connect(this.gain);
    }
    setGainAtTime(value, time=this.ctx.currentTime) {
      this.gain.gain.exponentialRampToValueAtTime(value+ZERO_GAIN_PAD, time+RAMP_SHARP_GAP);
    }
    mute() {
      this.gain.disconnect();
      this.muted = true;
    }
    unmute() {
      this.gain.connect(this.options.destination || this.ctx.destination);
      this.muted = false;
    }
  }

  class MusicalNote extends MusicalItem {
    // todo: support note overtones
    constructor(ctx, options={}) {
      super(ctx, options);
    }
    set type(value) {
      this.osc && (this.osc.type = value);
      this.options.type = value;
    }
    set wave(value) {
      this.osc && this.osc.setPeriodicWave(value);
      this.options.wave = value;
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
      this.osc.connect(this.analyser);
      this.unmute();
      this.osc.start();
    }
    stop() {
      if (!this.osc) return;
      this.osc.stop();
      delete this.osc;
    }
  }

  class MusicalInstrument extends MusicalItem {
    constructor(ctx, options={}) {
      super(ctx, options);
      
      this.notePlayers = {};
      this.unmute();
    }
    get type() {return this.options.type;}
    set type(value) {
      this.notePlayers.mapArray(x=>{x.type = value;});
      this.options.type = value;
    }
    get wave() {return this.options.wave;}
    set wave(value) {
      this.notePlayers.mapArray(x=>{x.wave = value;});
      this.options.wave = value;
    }
    setNoteStrengthAtTime(i, dB, time) {
      let dBTruncate = -99;
      if ((dB > dBTruncate) && !(i in this.notePlayers)) {
        this.notePlayers[i] = new MusicalNote(this.ctx, {
          destination: this.analyser,
          frequency: this.options.notes[i].frequency,
          gain: 0,
          wave: this.options.wave,
          type: this.options.type,
        });
        this.notePlayers[i].start();
      }
      if (!(i in this.notePlayers)) return;
      if (dB < dBTruncate) dB = -99;
      this.notePlayers[i].setGainAtTime((dB+99)/100, time);
    }
    setSpectrumAtTime(spectrum, time=this.ctx.currentTime) {
      spectrum.forEach((dB,i)=>this.setNoteStrengthAtTime(i, dB, time));
    }
  }

  class MusicalBuffer extends MusicalItem {
    bufferEventListeners = []
    constructor(ctx, options={}) {
      super(ctx, options);
    }
    get playbackTime() {
      return this.ctx.currentTime - this.ctxOffset;
    }
    addEventListener(type, listener, ...more) {
      if (type == 'ended') {
        // relay valid listeners to AudioBufferSourceNode
        this.bufferEventListeners.push({type, listener});
        if (this.buffer) this.buffer.addEventListener(type, listener);
      } else {
        MusicalItem.prototype.addEventListener.apply(this, [type, listener, ...more]);
      }
    }
    async load(input) {
      if (input.arrayBuffer) {
        this.filename = input.name;
        input = await input.arrayBuffer();
      }
      this.stop();
      this.audioData = await this.ctx.decodeAudioData(input);
    }
    loadFile(file) {
      return this.load(file);
    }
    restart(when, offset, duration) {
      this.stop();
      this.start(when, offset, duration);
    }
    start(when, offset, duration) {
      if (offset < 0) offset += this.audioData.duration;
      if (offset > this.audioData.duration || offset < 0) {
        console.error('duration specified is outside the available range of the buffer');
        return;
      }
      this.buffer = new AudioBufferSourceNode(this.ctx, this.options);
      this.bufferEventListeners.forEach(x=>this.buffer.addEventListener(x.type, x.listener));
      this.buffer.buffer = this.audioData;
      this.buffer.connect(this.analyser);
      this.unmute();
      this.buffer.start(when, offset, duration);
      this.ctxOffset = Math.max(when || 0, this.ctx.currentTime) - (offset || 0);
      this.dispatchEvent(new CustomEvent('started'));
    }
    stop() {
      if (!this.buffer) return;
      this.buffer.stop();
      this.buffer.disconnect();
      delete this.buffer;
      this.dispatchEvent(new CustomEvent('stopped'));
    }
  }
  
  Object.assign(window, {
    Music,
    MusicalItem,
    MusicalNote,
    MusicalInstrument,
    MusicalBuffer,
  })
})();