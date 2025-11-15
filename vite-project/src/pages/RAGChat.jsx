import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { streamQueryRAG, checkHealth } from "../services/ragApi";
import { base64ToUint8Array, pcmToWav, playWavAudio } from "../utils/audioUtils";

export default function RAGChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioQueueLength, setAudioQueueLength] = useState(0); // Track queue length to trigger playback
  const [audioContextReady, setAudioContextReady] = useState(false); // Track if audio context is ready
  const messagesEndRef = useRef(null);
  const audioContextRef = useRef(null);
  const statementBuffersRef = useRef(new Map()); // statement_index -> array of PCM chunks
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);

  // Check health on mount
  useEffect(() => {
    checkHealth()
      .then((health) => {
        setIsConnected(true);
        console.log("Gateway API connected:", health);
      })
      .catch((error) => {
        setIsConnected(false);
        console.error("Failed to connect to Gateway API:", error);
      });
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize audio context
  useEffect(() => {
    if (audioEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log(`[TTS] Audio context initialized: state=${audioContextRef.current.state}, sampleRate=${audioContextRef.current.sampleRate}`);
        
        // Check if context is ready (not suspended)
        if (audioContextRef.current.state === 'running') {
          setAudioContextReady(true);
        } else {
          setAudioContextReady(false);
          console.log(`[TTS] Audio context suspended - waiting for user interaction`);
        }
      } catch (error) {
        console.error("[TTS] Failed to initialize audio context:", error);
        setAudioEnabled(false);
      }
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [audioEnabled]);

  // Resume audio context on user interaction
  const resumeAudioContext = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log(`[TTS] Audio context resumed successfully after user interaction`);
        setAudioContextReady(true);
        return true;
      } catch (error) {
        console.error(`[TTS] Failed to resume audio context:`, error);
        return false;
      }
    }
    return true;
  };

  // Process audio queue - triggered when queue length changes
  useEffect(() => {
    if (!audioEnabled) {
      return;
    }

    const playNextAudio = async () => {
      // Prevent multiple simultaneous playback attempts
      if (isPlayingAudioRef.current) {
        console.log(`[TTS] Already playing audio, skipping...`);
        return;
      }

      // Check if we should continue
      if (audioQueueRef.current.length === 0) {
        isPlayingAudioRef.current = false;
        setAudioQueueLength(0);
        console.log(`[TTS] Audio queue empty, stopping playback`);
        return;
      }

      // Check audio context
      if (!audioContextRef.current) {
        console.warn(`[TTS] Audio context not available, skipping playback`);
        isPlayingAudioRef.current = false;
        return;
      }

      isPlayingAudioRef.current = true;
      const wavData = audioQueueRef.current.shift();
      const remainingCount = audioQueueRef.current.length;
      setAudioQueueLength(remainingCount); // Update state immediately
      console.log(`[TTS] Starting playback: ${wavData.length} bytes WAV (${remainingCount} remaining in queue)`);

      try {
        // Ensure audio context is resumed (browsers require user interaction)
        if (audioContextRef.current.state === 'suspended') {
          console.log(`[TTS] Audio context suspended, attempting to resume...`);
          const resumed = await resumeAudioContext();
          if (!resumed) {
            console.warn(`[TTS] Could not resume audio context, skipping playback`);
            isPlayingAudioRef.current = false;
            // Put the audio back in queue for retry
            audioQueueRef.current.unshift(wavData);
            setAudioQueueLength(audioQueueRef.current.length);
            return;
          }
        }
        
        // Play the audio and wait for it to complete
        console.log(`[TTS] Playing audio, waiting for completion...`);
        await playWavAudio(wavData, audioContextRef.current);
        console.log(`[TTS] Audio playback completed successfully`);
        
        // Mark as not playing
        isPlayingAudioRef.current = false;
        
        // Continue with next audio if available
        if (audioQueueRef.current.length > 0) {
          console.log(`[TTS] Queue has ${audioQueueRef.current.length} more items, continuing...`);
          // Small delay to ensure current audio is fully finished
          setTimeout(() => {
            setAudioQueueLength(audioQueueRef.current.length); // Trigger next playback
          }, 100);
        } else {
          setAudioQueueLength(0);
          console.log(`[TTS] Audio queue empty after playback`);
        }
      } catch (error) {
        console.error(`[TTS] Error playing audio (${wavData.length} bytes):`, error);
        // Mark as not playing
        isPlayingAudioRef.current = false;
        
        // Try next audio if available
        if (audioQueueRef.current.length > 0) {
          console.log(`[TTS] Attempting to play next audio after error`);
          setTimeout(() => {
            setAudioQueueLength(audioQueueRef.current.length); // Trigger retry
          }, 200);
        } else {
          setAudioQueueLength(0);
        }
      }
    };

    // Start playback if queue has items and not currently playing
    if (audioQueueLength > 0 && !isPlayingAudioRef.current) {
      console.log(`[TTS] Queue length changed to ${audioQueueLength}, starting playback...`);
      playNextAudio();
    }
  }, [audioEnabled, audioQueueLength]);


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Resume audio context on user interaction (sending message)
    if (audioEnabled && audioContextRef.current) {
      await resumeAudioContext();
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    const newUserMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    let assistantContent = "";
    let currentSessionId = sessionId;

    try {
      await streamQueryRAG(
        userMessage,
        currentSessionId,
        // onChunk - text chunk received
        (chunk, newSessionId) => {
          assistantContent += chunk;
          if (newSessionId && !currentSessionId) {
            currentSessionId = newSessionId;
            setSessionId(newSessionId);
          }
          
          // Update assistant message with streaming content
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = assistantContent;
            } else {
              updated.push({
                id: Date.now(),
                role: "assistant",
                content: assistantContent,
                timestamp: new Date(),
              });
            }
            return updated;
          });
        },
        // onAudio - audio chunk received
        (audioBase64, statementIndex, audioIndex) => {
          console.log(`[TTS] 📥 onAudio callback called: statementIndex=${statementIndex}, audioIndex=${audioIndex}, base64Length=${audioBase64?.length || 0}, audioEnabled=${audioEnabled}`);
          
          if (!audioEnabled) {
            console.log(`[TTS] Audio disabled, ignoring chunk ${audioIndex} for statement ${statementIndex}`);
            return;
          }
          
          try {
            if (!audioBase64 || audioBase64.length === 0) {
              console.warn(`[TTS] ⚠️ Empty audio chunk received for statement ${statementIndex}, index ${audioIndex}`);
              return;
            }
            
            // Decode base64 to PCM bytes
            console.log(`[TTS] Decoding base64 audio chunk (${audioBase64.length} chars)...`);
            const pcmChunk = base64ToUint8Array(audioBase64);
            console.log(`[TTS] Decoded to ${pcmChunk.length} bytes PCM`);
            
            if (pcmChunk.length === 0) {
              console.warn(`[TTS] ⚠️ Decoded PCM chunk is empty for statement ${statementIndex}, index ${audioIndex}`);
              return;
            }
            
            // Store PCM chunk for this statement
            if (!statementBuffersRef.current.has(statementIndex)) {
              statementBuffersRef.current.set(statementIndex, []);
              console.log(`[TTS] Created new buffer for statement ${statementIndex}`);
            }
            statementBuffersRef.current.get(statementIndex).push(pcmChunk);
            const bufferCount = statementBuffersRef.current.get(statementIndex).length;
            
            console.log(`[TTS] ✅ Audio chunk ${audioIndex} stored for statement ${statementIndex} (${pcmChunk.length} bytes PCM, ${audioBase64.length} base64 chars, buffer now has ${bufferCount} chunks)`);
          } catch (error) {
            console.error(`[TTS] ❌ Error processing audio chunk ${audioIndex} for statement ${statementIndex}:`, error);
            console.error(error);
          }
        },
        // onError
        (error) => {
          console.error("Streaming error:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              role: "assistant",
              content: `عذراً، حدث خطأ: ${error}`,
              timestamp: new Date(),
              isError: true,
            },
          ]);
        },
        // onComplete
        () => {
          setIsLoading(false);
        },
        // onAudioComplete - when audio for a statement is complete
        (statementIndex, successfulChunks, failedChunks) => {
          console.log(`[TTS] Audio complete for statement ${statementIndex} (successful: ${successfulChunks}, failed: ${failedChunks})`);
          console.log(`[TTS] Current audio queue length before processing: ${audioQueueRef.current.length}`);
          console.log(`[TTS] Statement buffers:`, Array.from(statementBuffersRef.current.keys()));
          
          if (!audioEnabled) {
            console.log(`[TTS] Audio disabled, clearing buffers for statement ${statementIndex}`);
            statementBuffersRef.current.delete(statementIndex);
            return;
          }
          
          // Process accumulated audio for this statement
          if (statementBuffersRef.current.has(statementIndex)) {
            const pcmChunks = statementBuffersRef.current.get(statementIndex);
            console.log(`[TTS] Found ${pcmChunks ? pcmChunks.length : 0} PCM chunks for statement ${statementIndex}`);
            
            if (pcmChunks && pcmChunks.length > 0) {
              // Combine all PCM chunks for this statement
              const totalLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
              console.log(`[TTS] Combining ${pcmChunks.length} PCM chunks for statement ${statementIndex} (total: ${totalLength} bytes)`);
              
              const combinedPCM = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of pcmChunks) {
                combinedPCM.set(chunk, offset);
                offset += chunk.length;
              }
              
              // Convert to WAV and queue for playback
              console.log(`[TTS] Converting PCM to WAV (${combinedPCM.length} bytes PCM)...`);
              const wavData = pcmToWav(combinedPCM, 24000, 1, 16); // 24kHz, mono, 16-bit
              console.log(`[TTS] WAV conversion complete: ${wavData.length} bytes WAV`);
              
              audioQueueRef.current.push(wavData);
              const newQueueLength = audioQueueRef.current.length;
              console.log(`[TTS] Audio pushed to queue. New queue length: ${newQueueLength}`);
              
              // Update state to trigger playback effect
              console.log(`[TTS] Setting audioQueueLength state to ${newQueueLength} to trigger playback...`);
              setAudioQueueLength(newQueueLength);
              console.log(`[TTS] State update triggered. isPlayingAudio: ${isPlayingAudioRef.current}`);
              
              // Clear buffer for this statement
              statementBuffersRef.current.delete(statementIndex);
              
              console.log(`[TTS] ✅ Audio queued for playback - statement ${statementIndex} (${wavData.length} bytes WAV, queue length: ${newQueueLength})`);
            } else {
              console.warn(`[TTS] ⚠️ No PCM chunks found for statement ${statementIndex} despite audio_complete event`);
            }
          } else {
            console.warn(`[TTS] ⚠️ No buffer found for statement ${statementIndex} when audio_complete received`);
            console.warn(`[TTS] Available statement buffers:`, Array.from(statementBuffersRef.current.keys()));
          }
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `عذراً، حدث خطأ في الاتصال: ${error.message}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSessionId(null);
    // Clear audio buffers and queue
    statementBuffersRef.current.clear();
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    setAudioQueueLength(0);
    console.log(`[TTS] Chat cleared, audio buffers and queue reset`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ⬅ Back
          </button>
          <h1 className="text-2xl font-bold">Arabic RAG Chat Assistant</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {sessionId && (
            <span className="text-xs text-gray-400">Session: {sessionId}</span>
          )}
          <button
            onClick={() => {
              const newState = !audioEnabled;
              setAudioEnabled(newState);
              console.log(`[TTS] TTS ${newState ? 'enabled' : 'disabled'}`);
              if (!newState) {
                // Clear audio queue when disabling
                audioQueueRef.current = [];
                isPlayingAudioRef.current = false;
                setAudioQueueLength(0);
              } else {
                // Reinitialize audio context when enabling
                if (!audioContextRef.current) {
                  try {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                    console.log(`[TTS] Audio context reinitialized`);
                    if (audioContextRef.current.state === 'running') {
                      setAudioContextReady(true);
                    } else {
                      setAudioContextReady(false);
                    }
                  } catch (error) {
                    console.error(`[TTS] Failed to reinitialize audio context:`, error);
                  }
                } else {
                  // Try to resume if suspended
                  resumeAudioContext();
                }
              }
            }}
            className={`px-4 py-2 rounded-lg transition-colors text-sm ${
              audioEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={audioEnabled ? 'Disable TTS' : 'Enable TTS'}
          >
            {audioEnabled ? '🔊 TTS On' : '🔇 TTS Off'}
          </button>
          <button
            onClick={handleClearChat}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <h2 className="text-2xl font-bold mb-2">Welcome to Arabic RAG Chat</h2>
              <p className="mb-4">Ask questions in Arabic and get intelligent responses based on uploaded documents.</p>
              <p className="text-sm">Example: "ما هي منتجات الشركة؟"</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : message.isError
                      ? "bg-red-900 text-red-100"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب سؤالك هنا... (Type your question in Arabic)"
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading || !isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isConnected}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
        {!isConnected && (
          <div className="max-w-4xl mx-auto mt-2 text-center text-red-400 text-sm">
            Cannot connect to backend. Please ensure the Gateway API is running on port 8000.
          </div>
        )}
        {audioEnabled && !audioContextReady && (
          <div className="max-w-4xl mx-auto mt-2 text-center text-yellow-400 text-sm">
            🔊 Audio requires user interaction. Send a message or click anywhere to enable audio playback.
          </div>
        )}
      </div>
    </div>
  );
}

