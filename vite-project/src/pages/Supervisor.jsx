import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SUPERVISOR_PASSCODES_KEY = "supervisorPasscodes";
const PROJECTS_STORAGE_KEY = "unityApps";
const APP_PASSCODES_KEY = "appPasscodes";

export default function Supervisor() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [usedPasscode, setUsedPasscode] = useState(null);
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [appPasscodes, setAppPasscodes] = useState(() => {
    const saved = localStorage.getItem(APP_PASSCODES_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  });
  const [passcodeError, setPasscodeError] = useState("");

  useEffect(() => {
    localStorage.setItem(APP_PASSCODES_KEY, JSON.stringify(appPasscodes));
  }, [appPasscodes]);

  // Update supervisor passcode usage time
  const updateSupervisorUsageTime = (usedCode, startTime) => {
    if (!usedCode || !startTime) return;
    
    const supervisorPasscodes = JSON.parse(localStorage.getItem(SUPERVISOR_PASSCODES_KEY) || "[]");
    if (supervisorPasscodes.length === 0) return;
    
    const sessionMinutes = Math.floor((Date.now() - startTime) / 60000); // Convert to minutes
    if (sessionMinutes > 0) {
      const updated = supervisorPasscodes.map(item => {
        const code = typeof item === 'string' ? item : item.code;
        if (code === usedCode) {
          if (typeof item === 'string') {
            return { code, usageMinutes: sessionMinutes };
          } else {
            return { ...item, usageMinutes: (item.usageMinutes || 0) + sessionMinutes };
          }
        }
        return typeof item === 'string' ? { code, usageMinutes: 0 } : item;
      });
      localStorage.setItem(SUPERVISOR_PASSCODES_KEY, JSON.stringify(updated));
    }
  };

  // Migrate supervisor passcodes from string array to object array with usage time
  useEffect(() => {
    const saved = localStorage.getItem(SUPERVISOR_PASSCODES_KEY);
    if (!saved) return;
    
    const parsed = JSON.parse(saved);
    // Check if it's an array of strings (old format)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      // Migrate to object format
      const migrated = parsed.map(code => ({
        code: code,
        usageMinutes: 0
      }));
      localStorage.setItem(SUPERVISOR_PASSCODES_KEY, JSON.stringify(migrated));
    }
  }, []);

  // Track session time and update usage when supervisor signs out or leaves
  useEffect(() => {
    if (!authorized || !sessionStartTime || !usedPasscode) return;

    const handleBeforeUnload = () => {
      updateSupervisorUsageTime(usedPasscode, sessionStartTime);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && sessionStartTime && usedPasscode) {
        updateSupervisorUsageTime(usedPasscode, sessionStartTime);
        setSessionStartTime(Date.now()); // Reset timer for when they come back
      }
    };

    // Periodic update every minute while supervisor is active
    const intervalId = setInterval(() => {
      if (sessionStartTime && usedPasscode) {
        const elapsedMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
        if (elapsedMinutes >= 1) {
          updateSupervisorUsageTime(usedPasscode, sessionStartTime);
          setSessionStartTime(Date.now());
        }
      }
    }, 60000); // Check every minute

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sessionStartTime && usedPasscode) {
        updateSupervisorUsageTime(usedPasscode, sessionStartTime);
      }
    };
  }, [authorized, sessionStartTime, usedPasscode]);

  // Migrate old format to new format
  useEffect(() => {
    const saved = localStorage.getItem(APP_PASSCODES_KEY);
    if (!saved) return;
    
    const parsed = JSON.parse(saved);
    let needsMigration = false;
    const migrated = {};
    
    Object.keys(parsed).forEach(appId => {
      const app = projects.find(p => p.id.toString() === appId.toString());
      const appName = app ? app.title.toLowerCase().replace(/\s+/g, '-') : 'app';
      let userCounter = 0;
      
      migrated[appId] = parsed[appId].map(item => {
        if (typeof item === 'string') {
          needsMigration = true;
          return {
            code: item,
            name: `${appName}-user${userCounter++}`,
            permission: true,
            paid: false,
            usageMinutes: 0
          };
        }
        // Migrate old object format to new format
        if (!item.name || item.permission === undefined || item.paid === undefined) {
          needsMigration = true;
          const code = item.code || item;
          const existingNames = parsed[appId].map(p => p.name || '');
          existingNames.forEach(name => {
            const match = name.match(/-user(\d+)$/);
            if (match) {
              const num = parseInt(match[1]);
              if (num >= userCounter) userCounter = num + 1;
            }
          });
          return {
            code: code,
            name: item.name || `${appName}-user${userCounter++}`,
            permission: item.permission !== undefined ? item.permission : true,
            paid: item.paid !== undefined ? item.paid : false,
            usageMinutes: item.usageMinutes || 0
          };
        }
        return item;
      });
    });
    
    // Save migrated data back to localStorage if migration occurred
    if (needsMigration) {
      setAppPasscodes(migrated);
    }
  }, [projects]);

  // Load projects when component mounts or when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    };

    window.addEventListener("projectsUpdated", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    handleStorageChange(); // Initial load

    return () => {
      window.removeEventListener("projectsUpdated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = passcode.trim();
    if (!trimmedInput) {
      setError("Please enter a passcode.");
      return;
    }
    // Get the list of valid passcodes created by admin
    const allowed = JSON.parse(localStorage.getItem(SUPERVISOR_PASSCODES_KEY) || "[]");
    
    // Check if the entered passcode matches any of the admin-created passcodes
    // Support both old format (string array) and new format (object array)
    const matchedCode = allowed.find(item => {
      const code = typeof item === 'string' ? item : item.code;
      return code === trimmedInput;
    });
    
    if (matchedCode) {
      setAuthorized(true);
      setError("");
      setUsedPasscode(trimmedInput);
      setSessionStartTime(Date.now());
    } else {
      setError("Invalid passcode. Please contact an administrator.");
      setAuthorized(false);
    }
  };

  const handleSignOut = () => {
    // Update usage time before signing out
    if (sessionStartTime && usedPasscode) {
      updateSupervisorUsageTime(usedPasscode, sessionStartTime);
    }
    setAuthorized(false);
    setPasscode("");
    setError("");
    setSessionStartTime(null);
    setUsedPasscode(null);
  };

  const generateRandomPasscode = () => {
    // Generate a random 8-digit number (10000000 to 99999999)
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const handleAddPasscode = (appId) => {
    let newPasscode;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    const existingPasscodes = appPasscodes[appId] || [];
    const existingCodes = existingPasscodes.map(p => typeof p === 'string' ? p : p.code);

    // Generate a unique passcode
    do {
      newPasscode = generateRandomPasscode();
      attempts++;
      if (attempts >= maxAttempts) {
        setPasscodeError("Unable to generate unique passcode. Please try again.");
        return;
      }
    } while (existingCodes.includes(newPasscode));

    // Get app name for default name generation
    const app = projects.find(p => p.id.toString() === appId.toString());
    const appName = app ? app.title.toLowerCase().replace(/\s+/g, '-') : 'app';
    
    // Find the highest user number to increment
    const existingNames = existingPasscodes.map(p => p.name || '');
    let userCounter = 0;
    existingNames.forEach(name => {
      const match = name.match(/-user(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= userCounter) userCounter = num + 1;
      }
    });

    const newPasscodeObj = {
      code: newPasscode,
      name: `${appName}-user${userCounter}`,
      permission: true,
      paid: false,
      usageMinutes: 0
    };

    setAppPasscodes({
      ...appPasscodes,
      [appId]: [...existingPasscodes, newPasscodeObj],
    });
    setPasscodeError("");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <Link
          to="/"
          className="absolute top-6 left-6 text-cyan-400 hover:text-cyan-300 transition-all duration-300 flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
        <div className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 md:p-10 shadow-2xl w-full max-w-md border border-white/10 animate-scale-in">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl opacity-30 blur-xl"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse-slow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Supervisor Access
              </h1>
              <p className="text-slate-400 text-base">
                Enter the passcode provided by an administrator
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter supervisor passcode"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 text-white transition-all duration-300"
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-cyan-500/0 focus-within:from-purple-500/10 focus-within:via-pink-500/10 focus-within:to-cyan-500/10 transition-all duration-300 pointer-events-none"></div>
                </div>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-shake">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="relative w-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
              >
                <span className="relative z-10">Unlock Access</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const totalPasscodes = Object.values(appPasscodes).reduce((sum, codes) => sum + codes.length, 0);
  const totalUsage = Object.values(appPasscodes).reduce((sum, codes) => {
    return sum + codes.reduce((codeSum, code) => codeSum + (code.usageMinutes || 0), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 shadow-2xl backdrop-blur-xl border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-pink-600/90 to-cyan-600/90 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between animate-fade-in-down">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent drop-shadow-2xl">
                Supervisor Console
              </h1>
              <p className="text-purple-100 text-base md:text-lg font-medium tracking-wide">Manage app passcodes for each project</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden md:block px-5 py-2.5 text-sm font-semibold text-white hover:text-purple-100 transition-all duration-300 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm border border-white/20"
              >
                Home
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white hover:text-purple-100 transition-all duration-300 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Total Projects</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{projects.length}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-cyan-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up delay-100">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Total Passcodes</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{totalPasscodes}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-emerald-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up delay-200">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Total Usage</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{totalUsage} min</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-8 animate-fade-in-down">
          <h2 className="text-4xl font-extrabold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            App Passcodes Management
          </h2>
          <p className="text-slate-400 text-base">Generate and view passcodes for each application</p>
        </div>

        {projects.length === 0 ? (
          <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center shadow-2xl animate-fade-in">
            <div className="inline-block p-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-3xl mb-6 border border-white/10">
              <svg className="w-20 h-20 text-slate-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">No Projects Available</h3>
            <p className="text-slate-400 text-lg">Add projects from the admin page to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project, index) => {
              const projectPasscodes = appPasscodes[project.id] || [];
              const projectUsage = projectPasscodes.reduce((sum, code) => sum + (code.usageMinutes || 0), 0);
              
              return (
                <div 
                  key={project.id} 
                  className="relative group bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl hover:border-purple-400/50 transition-all duration-500 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                          {project.title}
                        </h3>
                        <span className="px-4 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30 backdrop-blur-sm">
                          {projectPasscodes.length} {projectPasscodes.length === 1 ? 'passcode' : 'passcodes'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3 leading-relaxed">{project.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-2 text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-emerald-400">{projectUsage} min</span> total usage
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPasscode(project.id)}
                      className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 whitespace-nowrap overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Generate Passcode
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                  
                  {passcodeError && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-shake backdrop-blur-sm">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-400 text-sm font-medium">{passcodeError}</p>
                    </div>
                  )}

                  <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-left text-slate-300">Name</th>
                            <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-left text-slate-300">Passcode</th>
                            <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-center text-slate-300">Permission</th>
                            <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-center text-slate-300">Paid</th>
                            <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-right text-slate-300">Usage Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {projectPasscodes.length === 0 ? (
                            <tr>
                              <td className="px-6 py-12 text-slate-400 text-center" colSpan="5">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                  <p className="font-medium">No passcodes yet. Generate one above.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            projectPasscodes.map((item) => {
                              const code = typeof item === 'string' ? item : item.code;
                              const name = item.name || 'N/A';
                              const permission = typeof item === 'string' ? true : (item.permission !== undefined ? item.permission : true);
                              const paid = typeof item === 'string' ? false : (item.paid !== undefined ? item.paid : false);
                              const usageMinutes = typeof item === 'string' ? 0 : (item.usageMinutes || 0);
                              return (
                                <tr key={code} className="hover:bg-slate-800/40 transition-all duration-300 group/row">
                                  <td className="px-6 py-4">
                                    <span className="text-white font-medium group-hover/row:text-purple-300 transition-colors">{name}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="font-mono text-purple-400 bg-purple-500/10 px-4 py-2 rounded-xl text-sm border border-purple-500/20 group-hover/row:bg-purple-500/20 transition-colors">
                                      {code}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${permission ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                      {permission ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${paid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                                      {paid ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="text-slate-300 font-semibold bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">{usageMinutes} min</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
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
