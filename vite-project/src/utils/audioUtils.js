/**
 * Utility functions for handling LINEAR16 PCM audio
 */

/**
 * Convert LINEAR16 PCM bytes to WAV format by adding WAV header
 * @param {Uint8Array} pcmData - Raw LINEAR16 PCM audio data
 * @param {number} sampleRate - Sample rate (default: 24000 for Google TTS)
 * @param {number} channels - Number of channels (default: 1 for mono)
 * @param {number} bitsPerSample - Bits per sample (default: 16)
 * @returns {Uint8Array} WAV file data
 */
export function pcmToWav(pcmData, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const length = pcmData.length;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true); // File size - 8
  writeString(8, 'WAVE');
  
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, channels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true); // Byte rate
  view.setUint16(32, channels * bitsPerSample / 8, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample
  
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, length, true); // Data size
  
  // Copy PCM data
  const wavData = new Uint8Array(buffer);
  wavData.set(pcmData, 44);
  
  return wavData;
}

/**
 * Decode base64 string to Uint8Array
 * @param {string} base64 - Base64 encoded string
 * @returns {Uint8Array} Decoded bytes
 */
export function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Play WAV audio using Web Audio API
 * @param {Uint8Array} wavData - WAV file data
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {Promise<void>} Promise that resolves when audio finishes playing
 */
export async function playWavAudio(wavData, audioContext) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[Audio] Creating audio blob from ${wavData.length} bytes WAV data`);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      console.log(`[Audio] Created blob URL: ${url.substring(0, 50)}...`);
      
      const audio = new Audio(url);
      audio.preload = 'auto';
      
      // Set up event handlers
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(url);
        }
      };
      
      audio.onloadeddata = () => {
        console.log(`[Audio] Audio data loaded, duration: ${audio.duration}s`);
      };
      
      audio.oncanplay = () => {
        console.log(`[Audio] Audio can play`);
      };
      
      audio.oncanplaythrough = () => {
        console.log(`[Audio] Audio can play through (fully loaded)`);
      };
      
      audio.onended = () => {
        console.log(`[Audio] Audio playback ended successfully`);
        cleanup();
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error(`[Audio] Audio playback error:`, error);
        console.error(`[Audio] Error details:`, audio.error);
        console.error(`[Audio] Error code:`, audio.error?.code);
        console.error(`[Audio] Error message:`, audio.error?.message);
        cleanup();
        reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
      };
      
      audio.onabort = () => {
        console.warn(`[Audio] Audio playback aborted`);
        cleanup();
        reject(new Error('Audio playback was aborted'));
      };
      
      audio.onstalled = () => {
        console.warn(`[Audio] Audio playback stalled`);
      };
      
      audio.onsuspend = () => {
        console.warn(`[Audio] Audio playback suspended`);
      };
      
      console.log(`[Audio] Attempting to play audio...`);
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`[Audio] Audio play() promise resolved - playback started`);
          })
          .catch((err) => {
            console.error(`[Audio] Audio play() promise rejected:`, err);
            cleanup();
            reject(err);
          });
      } else {
        // Fallback for browsers that don't return a promise
        console.log(`[Audio] Audio play() called (no promise returned)`);
      }
    } catch (error) {
      console.error(`[Audio] Error creating audio element:`, error);
      reject(error);
    }
  });
}

