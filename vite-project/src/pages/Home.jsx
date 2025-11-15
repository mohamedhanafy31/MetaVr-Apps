import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PROJECTS_STORAGE_KEY = "unityApps";
const APP_PASSCODES_KEY = "appPasscodes";

// Default projects to initialize if localStorage is empty
const DEFAULT_PROJECTS = [
  {
    id: 1,
    title: "3D Racing Game",
    description: "Race in high-speed 3D tracks made in Unity!",
    image: "https://picsum.photos/600/400?random=1",
    path: "/racing",
  },
  {
    id: 5,
    title: "Background Replacer",
    description: "Remove your photo's background and replace it instantly.",
    image: "https://picsum.photos/600/400?random=5",
    path: "/background-replacer",
  },
  {
    id: 6,
    title: "AR Face Mask Try-On",
    description: "Try on virtual masks and glasses in real-time using your webcam.",
    image: "https://picsum.photos/600/400?random=6",
    path: "/ar-face-mask",
  },
  {
    id: 2,
    title: "VR Simulation",
    description: "Experience immersive VR training modules.",
    image: "https://picsum.photos/600/400?random=2",
    path: "/vr-sim",
  },
  {
    id: 3,
    title: "AI NPC Demo",
    description: "Talk to AI characters in different fields, Very Useful for Companies that needs to increase their online leads",
    image: "https://picsum.photos/600/400?random=3",
    path: "/unity/npc/index.html",
  },
  {
    id: 4,
    title: "Arabic RAG Chat",
    description: "Ask questions in Arabic and get intelligent responses from uploaded documents.",
    image: "https://picsum.photos/600/400?random=4",
    path: "/rag-chat",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [unityApps, setUnityApps] = useState(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    // Initialize with default projects if localStorage is empty
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  });
  const [passcodeModal, setPasscodeModal] = useState({ show: false, app: null, passcode: "", error: "" });
  const [accessDeniedModal, setAccessDeniedModal] = useState({ show: false, appName: "" });
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [activeSession, setActiveSession] = useState({ appId: null, passcode: null });

  // Listen for storage changes to update the list when admin adds/deletes projects
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        setUnityApps(JSON.parse(saved));
      }
    };

    // Listen for custom event (for same-tab updates)
    window.addEventListener("projectsUpdated", handleStorageChange);
    // Listen for storage event (for cross-tab updates)
    window.addEventListener("storage", handleStorageChange);
    // Also check on focus (when user comes back to this tab)
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("projectsUpdated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const updateUsageTime = (appId, usedPasscode, startTime, forceUpdate = false) => {
    if (!appId || !usedPasscode || !startTime) return;
    
    const appPasscodes = JSON.parse(localStorage.getItem(APP_PASSCODES_KEY) || "{}");
    const appCodes = appPasscodes[appId] || [];
    
    if (appCodes.length === 0) return;
    
    const elapsedMs = Date.now() - startTime;
    const sessionMinutes = Math.floor(elapsedMs / 60000); // Convert to minutes
    const sessionSeconds = Math.floor(elapsedMs / 1000); // Total seconds
    
    // Update if at least 1 minute has passed, or if forced (e.g., on navigation)
    if (sessionMinutes > 0 || (forceUpdate && sessionSeconds >= 30)) {
      const minutesToAdd = forceUpdate && sessionSeconds >= 30 && sessionMinutes === 0 ? 1 : sessionMinutes;
      
      // Update only the specific passcode that was used, preserving all fields
      const updated = appCodes.map(item => {
        const code = typeof item === 'string' ? item : item.code;
        
        if (code === usedPasscode) {
          if (typeof item === 'string') {
            return { code, name: '', permission: true, paid: false, usageMinutes: minutesToAdd };
          } else {
            return { ...item, usageMinutes: (item.usageMinutes || 0) + minutesToAdd };
          }
        }
        // Return item as-is (preserving all fields)
        return typeof item === 'string' 
          ? { code, name: '', permission: true, paid: false, usageMinutes: 0 }
          : item;
      });
      
      appPasscodes[appId] = updated;
      localStorage.setItem(APP_PASSCODES_KEY, JSON.stringify(appPasscodes));
      return true; // Indicate that update was successful
    }
    return false;
  };

  // Track session time and update usage when user leaves the app
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to get from state first
      if (sessionStartTime && activeSession.appId && activeSession.passcode) {
        updateUsageTime(activeSession.appId, activeSession.passcode, sessionStartTime, true);
      } else {
        // Fallback to sessionStorage/localStorage (for Unity apps)
        const checkStorage = (storage) => {
          const sessionInfo = storage.getItem('activeAppSession');
          if (sessionInfo) {
            try {
              const session = JSON.parse(sessionInfo);
              if (session.appId && session.passcode && session.startTime) {
                updateUsageTime(session.appId, session.passcode, session.startTime, true);
              }
            } catch (e) {
              console.error('Error parsing session info:', e);
            }
          }
        };
        checkStorage(sessionStorage);
        checkStorage(localStorage);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized - update usage time
        if (sessionStartTime && activeSession.appId && activeSession.passcode) {
          updateUsageTime(activeSession.appId, activeSession.passcode, sessionStartTime, true);
          const newStartTime = Date.now();
          setSessionStartTime(newStartTime);
          // Update sessionStorage
          const sessionInfo = {
            appId: activeSession.appId,
            passcode: activeSession.passcode,
            startTime: newStartTime
          };
          sessionStorage.setItem('activeAppSession', JSON.stringify(sessionInfo));
        }
      }
    };

    // Periodic update every 30 seconds while app is active
    const intervalId = setInterval(() => {
      if (sessionStartTime && activeSession.appId && activeSession.passcode) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        
        // Update every minute, or if at least 30 seconds have passed
        if (elapsedMinutes >= 1 || elapsedSeconds >= 30) {
          // Update usage time
          const updated = updateUsageTime(activeSession.appId, activeSession.passcode, sessionStartTime, elapsedSeconds >= 30);
          if (updated) {
            // Reset start time after successful update
            const newStartTime = Date.now();
            setSessionStartTime(newStartTime);
            // Update sessionStorage
            const sessionInfo = {
              appId: activeSession.appId,
              passcode: activeSession.passcode,
              startTime: newStartTime
            };
            sessionStorage.setItem('activeAppSession', JSON.stringify(sessionInfo));
          }
        }
      }
    }, 30000); // Check every 30 seconds

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sessionStartTime && activeSession.appId && activeSession.passcode) {
        updateUsageTime(activeSession.appId, activeSession.passcode, sessionStartTime, true);
      }
    };
  }, [sessionStartTime, activeSession]);

  // Check for existing session on mount (for Unity apps that reload)
  useEffect(() => {
    // Check both sessionStorage and localStorage for active sessions
    const checkAndProcessSession = (storage, storageName) => {
      const sessionInfo = storage.getItem('activeAppSession');
      if (sessionInfo) {
        try {
          const session = JSON.parse(sessionInfo);
          if (session.appId && session.passcode && session.startTime) {
            // Use leaveTime if available (when user was on Unity app), otherwise use current time
            const endTime = session.leaveTime || Date.now();
            const elapsedMs = endTime - session.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            
            // Update if at least 30 seconds have passed
            if (elapsedSeconds >= 30) {
              const minutesToAdd = elapsedMinutes > 0 ? elapsedMinutes : 1;
              updateUsageTime(session.appId, session.passcode, session.startTime, true);
            }
            // Clear the session as we've processed it
            storage.removeItem('activeAppSession');
          }
        } catch (e) {
          console.error(`Error processing session info from ${storageName}:`, e);
          storage.removeItem('activeAppSession');
        }
      }
    };
    
    checkAndProcessSession(localStorage, 'localStorage');
    checkAndProcessSession(sessionStorage, 'sessionStorage');
  }, []);

  const handleAppClick = (app) => {
    // Always show passcode modal for all apps
    setPasscodeModal({ show: true, app, passcode: "", error: "" });
  };

  const accessApp = (app, usedPasscode = null) => {
    if (usedPasscode) {
      const startTime = Date.now();
      setActiveSession({ appId: app.id, passcode: usedPasscode });
      setSessionStartTime(startTime);
      
      // Save session info to sessionStorage for tracking (especially for Unity apps that reload)
      const sessionInfo = {
        appId: app.id,
        passcode: usedPasscode,
        startTime: startTime
      };
      sessionStorage.setItem('activeAppSession', JSON.stringify(sessionInfo));
    }
    
    if (app.path.startsWith("/unity")) {
      // For Unity apps, we need to track time while on the Unity page
      // Save a marker in localStorage to track when user left
      if (usedPasscode) {
        const startTime = sessionStartTime || Date.now();
        const sessionInfo = {
          appId: app.id,
          passcode: usedPasscode,
          startTime: startTime
        };
        // Save to both sessionStorage and localStorage (localStorage persists across page reloads)
        sessionStorage.setItem('activeAppSession', JSON.stringify(sessionInfo));
        localStorage.setItem('activeAppSession', JSON.stringify(sessionInfo));
      }
      // Open the Unity static file directly (real reload)
      window.location.href = app.path;
    } else {
      // Normal internal React route
      navigate(app.path);
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = passcodeModal.passcode.trim();
    
    if (!trimmedInput) {
      setPasscodeModal({ ...passcodeModal, error: "Please enter a passcode." });
      return;
    }

    const appPasscodes = JSON.parse(localStorage.getItem(APP_PASSCODES_KEY) || "{}");
    const appCodes = appPasscodes[passcodeModal.app.id] || [];
    
    // If no passcodes exist for this app, reject access
    if (appCodes.length === 0) {
      setPasscodeModal({ ...passcodeModal, error: "No passcodes configured for this app. Please contact a supervisor." });
      return;
    }
    
    // Find matching passcode
    let matchedCode = null;
    const updatedCodes = appCodes.map(item => {
      const code = typeof item === 'string' ? item : item.code;
      
      if (code === trimmedInput) {
        // Preserve all fields from the passcode object
        if (typeof item === 'string') {
          matchedCode = { code };
          return { code, name: '', permission: true, paid: false, usageMinutes: 0 };
        } else {
          matchedCode = item;
          return item; // Keep all existing fields
        }
      }
      // Return item as-is (preserving all fields)
      return typeof item === 'string' 
        ? { code, name: '', permission: true, paid: false, usageMinutes: 0 }
        : item;
    });

    if (matchedCode) {
      // Check permission
      const permission = typeof matchedCode === 'string' ? true : (matchedCode.permission !== undefined ? matchedCode.permission : true);
      const appName = passcodeModal.app.title;
      
      if (!permission) {
        // Access denied - show access denied modal
        setPasscodeModal({ show: false, app: null, passcode: "", error: "" });
        setAccessDeniedModal({ show: true, appName });
        return;
      }
      
      // Valid passcode with permission - update storage and grant access
      appPasscodes[passcodeModal.app.id] = updatedCodes;
      localStorage.setItem(APP_PASSCODES_KEY, JSON.stringify(appPasscodes));
      
      const app = passcodeModal.app;
      const passcode = trimmedInput;
      
      // Close modal and access app
      setPasscodeModal({ show: false, app: null, passcode: "", error: "" });
      accessApp(app, passcode);
    } else {
      setPasscodeModal({ ...passcodeModal, error: "Invalid passcode. Please try again." });
    }
  };

  const handleCloseModal = () => {
    setPasscodeModal({ show: false, app: null, passcode: "", error: "" });
  };

  const handleCloseAccessDeniedModal = () => {
    setAccessDeniedModal({ show: false, appName: "" });
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (passcodeModal.show) handleCloseModal();
        if (accessDeniedModal.show) handleCloseAccessDeniedModal();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [passcodeModal.show, accessDeniedModal.show]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 shadow-2xl backdrop-blur-xl border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-cyan-600/90 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center animate-fade-in-down">
            <div className="inline-block mb-4 animate-bounce-slow">
              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 bg-gradient-to-r from-white via-cyan-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                AI APPS
              </h1>
            </div>
            <div className="inline-block text-4xl mb-3 animate-float">🚀</div>
            <p className="text-indigo-100 text-base md:text-lg font-medium tracking-wide">
              Explore our collection of AI-powered applications
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {unityApps.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-block p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl mb-6 border border-white/10 shadow-2xl">
              <svg className="w-20 h-20 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              No Apps Available
            </h2>
            <p className="text-slate-400 text-lg">Check back later for new applications.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {unityApps.map((app, index) => (
              <div
                key={app.id}
                className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 hover:border-cyan-400/50 transition-all duration-500 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative overflow-hidden">
                  <div className="relative h-52 overflow-hidden">
                    <img 
                      src={app.image} 
                      alt={app.title} 
                      className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                        New
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative p-6">
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                    {app.title}
                  </h2>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                    {app.description}
                  </p>
                  <button
                    onClick={() => handleAppClick(app)}
                    className="relative w-full group/btn overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-2xl hover:shadow-cyan-500/50"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span>Play Now</span>
                      <svg className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-indigo-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Passcode Validation Modal */}
      {passcodeModal.show && passcodeModal.app && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/10 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-3xl opacity-30 blur-xl"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-slow">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Enter Passcode</h3>
                    <p className="text-slate-400 text-sm mt-1 font-medium">{passcodeModal.app.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-white transition-all duration-200 p-2 hover:bg-slate-700/50 rounded-xl hover:rotate-90 transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handlePasscodeSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    8-Digit Passcode
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passcodeModal.passcode}
                      onChange={(e) => setPasscodeModal({ ...passcodeModal, passcode: e.target.value, error: "" })}
                      placeholder="••••••••"
                      className="w-full px-6 py-5 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-600 transition-all duration-300"
                      autoFocus
                      maxLength={8}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-purple-500/0 to-indigo-500/0 focus-within:from-cyan-500/10 focus-within:via-purple-500/10 focus-within:to-indigo-500/10 transition-all duration-300 pointer-events-none"></div>
                  </div>
                </div>
                
                {passcodeModal.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-shake">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-400 text-sm">{passcodeModal.error}</p>
                  </div>
                )}
                
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-4 rounded-2xl font-semibold bg-slate-700/50 hover:bg-slate-700 text-white transition-all duration-300 transform hover:scale-105 active:scale-95 border border-slate-600/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-2xl font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 active:scale-95 relative overflow-hidden group"
                  >
                    <span className="relative z-10">Access App</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Access Denied Modal */}
      {accessDeniedModal.show && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseAccessDeniedModal}
        >
          <div 
            className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-red-500/30 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl opacity-30 blur-xl"></div>
            
            <div className="relative">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center mb-6 border border-red-500/30 animate-pulse-slow">
                  <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Access Denied
                </h3>
                <p className="text-slate-400 text-sm mb-1">
                  App: <span className="font-semibold text-white">{accessDeniedModal.appName}</span>
                </p>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                <p className="text-red-300 text-center leading-relaxed">
                  Your passcode does not have permission to access this application. Please contact an administrator to enable access.
                </p>
              </div>
              
              <button
                onClick={handleCloseAccessDeniedModal}
                className="w-full px-6 py-4 rounded-2xl font-semibold bg-slate-700/50 hover:bg-slate-700 text-white transition-all duration-300 transform hover:scale-105 active:scale-95 border border-slate-600/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
