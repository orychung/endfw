import { SoundTouch, PitchShifter } from 'https://unpkg.com/soundtouchjs@0.2.0/dist/soundtouch.js';

// Register AudioWorkletProcessor
async function setupSoundtouchWorklet(context, options={}) {
  if (!context) context = new AudioContext({sampleRate: 96000});
  try {
    // Load the SoundTouch AudioWorkletProcessor
    await context.audioWorklet.addModule(
      'https://unpkg.com/@soundtouchjs/audio-worklet@0.2.0/dist/soundtouch-worklet.js'
    );
    
    // Create SoundTouch AudioWorkletNode (NOTE: this is not an AudioNode)
    let soundtouchNode = new AudioWorkletNode(context, 'soundtouch-processor', {
      processorOptions: {
        sampleRate: context.sampleRate,
        pitch: options.pitch ?? 1,
      },
    });
    
    const RAMP_SHARP_GAP = 0.01;
    soundtouchNode.setParam = function setParam(name, value, delay = 0) {
      this.parameters.get(name)
        .exponentialRampToValueAtTime(value, this.context.currentTime + RAMP_SHARP_GAP + delay);
    };
    
    // Connect to destination
    soundtouchNode.connect(context.destination);
    return soundtouchNode;
  } catch (error) {
    console.error('Error setting up SoundTouch worklet:', error);
  }
};

export { setupSoundtouchWorklet };
