/**
 * API service for communicating with the E-commerce Arabic RAG backend
 * Uses the gateway API on port 8000
 */

const GATEWAY_API_URL = import.meta.env.VITE_GATEWAY_API_URL || 'http://localhost:8000';

/**
 * Send a query to the RAG system
 * @param {string} text - The user's query text
 * @param {string} sessionId - Optional session ID for conversation continuity
 * @returns {Promise<{content: string, session_id?: string}>}
 */
export async function queryRAG(text, sessionId = null) {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        session_id: sessionId,
        model_choice: 'gemini',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying RAG:', error);
    throw error;
  }
}

/**
 * Stream a query to the RAG system with real-time updates
 * @param {string} text - The user's query text
 * @param {string} sessionId - Optional session ID for conversation continuity
 * @param {Function} onChunk - Callback function called for each chunk of text
 * @param {Function} onAudio - Callback function called for each audio chunk
 * @param {Function} onError - Callback function called on error
 * @param {Function} onComplete - Callback function called when stream completes
 * @param {Function} onAudioComplete - Callback function called when audio for a statement completes
 * @returns {Promise<void>}
 */
export async function streamQueryRAG(text, sessionId, onChunk, onAudio, onError, onComplete, onAudioComplete) {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/query-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        session_id: sessionId,
        model_choice: 'gemini',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (onComplete) onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue; // Skip empty lines
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            console.log(`[API] Received [DONE] signal`);
            if (onComplete) onComplete();
            return;
          }

          if (data === '') continue; // Skip empty data lines

          try {
            const json = JSON.parse(data);
            console.log(`[API] Parsed SSE JSON:`, Object.keys(json), `has audio: ${!!json.audio}, has content: ${!!json.content}, has audio_complete: ${!!json.audio_complete}`);
            
            if (json.content) {
              // Text chunk from RAG
              console.log(`[API] Text chunk received: ${json.content.substring(0, 50)}...`);
              if (onChunk) onChunk(json.content, json.session_id);
            } else if (json.audio) {
              // Audio chunk from TTS
              console.log(`[API] ✅ Received audio chunk: statement_index=${json.statement_index}, audio_index=${json.audio_index}, base64_length=${json.audio.length}`);
              if (onAudio) {
                onAudio(json.audio, json.statement_index, json.audio_index);
              } else {
                console.warn(`[API] ⚠️ onAudio callback not provided!`);
              }
            } else if (json.audio_error) {
              // TTS-specific error
              console.error(`[API] TTS error for statement ${json.statement_index}:`, json.audio_error);
              if (onError) onError(`TTS Error: ${json.audio_error}`);
            } else if (json.error) {
              // Error occurred
              console.error(`[API] Error:`, json.error);
              if (onError) onError(json.error);
            } else if (json.audio_complete) {
              // Audio chunk completed for a statement
              console.log(`[API] ✅ Audio complete event: statement_index=${json.statement_index}, successful=${json.successful_chunks}, failed=${json.failed_chunks}`);
              if (onAudioComplete) {
                onAudioComplete(json.statement_index, json.successful_chunks, json.failed_chunks);
              } else {
                console.warn(`[API] ⚠️ onAudioComplete callback not provided!`);
              }
            } else if (json.type === 'tts_metadata') {
              // TTS metadata (voice info, etc.)
              console.log(`[API] TTS metadata:`, json);
            } else {
              // Unknown message type
              console.log(`[API] Unknown SSE message type:`, json);
            }
          } catch (e) {
            // Log malformed JSON for debugging
            console.warn(`[API] ⚠️ Failed to parse SSE data (length: ${data.length}):`, data.substring(0, 100), '...', e);
          }
        } else if (line.trim() !== '') {
          // Log non-data lines for debugging
          console.log(`[API] Non-data SSE line:`, line.substring(0, 100));
        }
      }
    }
  } catch (error) {
    console.error('Error streaming RAG query:', error);
    if (onError) onError(error.message);
    throw error;
  }
}

/**
 * Get all active sessions
 * @returns {Promise<{sessions: Array, total_sessions: number}>}
 */
export async function getSessions() {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/sessions`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
}

/**
 * Get session information
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>}
 */
export async function getSessionInfo(sessionId) {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/sessions/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting session info:', error);
    throw error;
  }
}

/**
 * Delete a session
 * @param {string} sessionId - The session ID to delete
 * @returns {Promise<Object>}
 */
export async function deleteSession(sessionId) {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Clear session history
 * @param {string} sessionId - The session ID to clear
 * @returns {Promise<Object>}
 */
export async function clearSession(sessionId) {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/sessions/${sessionId}/clear`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing session:', error);
    throw error;
  }
}

/**
 * Check gateway health
 * @returns {Promise<Object>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${GATEWAY_API_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

