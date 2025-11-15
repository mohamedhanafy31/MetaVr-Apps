import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PROJECTS_STORAGE_KEY = "unityApps";
const APP_PASSCODES_KEY = "appPasscodes";
const SUPERVISOR_PASSCODES_KEY = "supervisorPasscodes";
const ADMIN_PASSCODE = "31720032025";
const ADMIN_AUTH_KEY = "adminAuthorized";

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

export default function AdminHome() {
  const [authorized, setAuthorized] = useState(() => {
    // Check if admin is already authorized (from sessionStorage)
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    // Initialize with default projects if localStorage is empty
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  });

  const [appPasscodes, setAppPasscodes] = useState(() => {
    const saved = localStorage.getItem(APP_PASSCODES_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [supervisorPasscodes, setSupervisorPasscodes] = useState(() => {
    const saved = localStorage.getItem(SUPERVISOR_PASSCODES_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Migrate old format (string array) to new format (object array)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      const migrated = parsed.map(code => ({ code, usageMinutes: 0 }));
      localStorage.setItem(SUPERVISOR_PASSCODES_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  });

  const [supervisorPasscodeError, setSupervisorPasscodeError] = useState("");

  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    image: "",
    path: "",
  });
  const [projectError, setProjectError] = useState("");
  const [deleteModal, setDeleteModal] = useState({ show: false, projectId: null, projectTitle: "" });
  const [managePasscodesModal, setManagePasscodesModal] = useState({ show: false, project: null });
  const [editingPasscode, setEditingPasscode] = useState(null);

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(APP_PASSCODES_KEY, JSON.stringify(appPasscodes));
  }, [appPasscodes]);

  useEffect(() => {
    localStorage.setItem(SUPERVISOR_PASSCODES_KEY, JSON.stringify(supervisorPasscodes));
  }, [supervisorPasscodes]);

  const handleAddProject = () => {
    if (!newProject.title.trim() || !newProject.description.trim() || !newProject.image.trim() || !newProject.path.trim()) {
      setProjectError("All fields are required.");
      return;
    }

    const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
    const project = {
      id: newId,
      ...newProject,
    };

    const updatedProjects = [...projects, project];
    setProjects(updatedProjects);
    setNewProject({ title: "", description: "", image: "", path: "" });
    setShowAddProject(false);
    setProjectError("");
    // Dispatch custom event to notify Home page
    window.dispatchEvent(new Event("projectsUpdated"));
  };

  const handleDeleteProject = (id, title) => {
    setDeleteModal({ show: true, projectId: id, projectTitle: title });
  };

  const confirmDeleteProject = () => {
    if (deleteModal.projectId) {
      const updatedProjects = projects.filter(p => p.id !== deleteModal.projectId);
      setProjects(updatedProjects);
      // Also remove passcodes for this project
      const updatedPasscodes = { ...appPasscodes };
      delete updatedPasscodes[deleteModal.projectId];
      setAppPasscodes(updatedPasscodes);
      // Dispatch custom event to notify Home page
      window.dispatchEvent(new Event("projectsUpdated"));
    }
    setDeleteModal({ show: false, projectId: null, projectTitle: "" });
  };

  const cancelDeleteProject = () => {
    setDeleteModal({ show: false, projectId: null, projectTitle: "" });
  };

  const handleManagePasscodes = (project) => {
    setManagePasscodesModal({ show: true, project });
    setEditingPasscode(null);
  };

  const handleCloseManageModal = () => {
    setManagePasscodesModal({ show: false, project: null });
    setEditingPasscode(null);
  };

  const handleEditPasscode = (passcode) => {
    setEditingPasscode({ ...passcode });
  };

  const handleSavePasscode = () => {
    if (!editingPasscode || !editingPasscode.name.trim()) {
      return;
    }

    const projectId = managePasscodesModal.project.id;
    const passcodes = appPasscodes[projectId] || [];
    const updated = passcodes.map(p => 
      p.code === editingPasscode.code ? editingPasscode : p
    );
    
    setAppPasscodes({
      ...appPasscodes,
      [projectId]: updated
    });
    setEditingPasscode(null);
  };

  const handleDeletePasscode = (code) => {
    const projectId = managePasscodesModal.project.id;
    const passcodes = appPasscodes[projectId] || [];
    const updated = passcodes.filter(p => p.code !== code);
    
    if (updated.length === 0) {
      const { [projectId]: removed, ...rest } = appPasscodes;
      setAppPasscodes(rest);
    } else {
      setAppPasscodes({
        ...appPasscodes,
        [projectId]: updated
      });
    }
  };

  const generateRandomPasscode = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const handleAddSupervisorPasscode = () => {
    let newPasscode;
    let attempts = 0;
    const maxAttempts = 100;

    const existingCodes = supervisorPasscodes.map(p => typeof p === 'string' ? p : p.code);

    do {
      newPasscode = generateRandomPasscode();
      attempts++;
      if (attempts >= maxAttempts) {
        setSupervisorPasscodeError("Unable to generate unique passcode. Please try again.");
        return;
      }
    } while (existingCodes.includes(newPasscode));

    setSupervisorPasscodes([...supervisorPasscodes, { code: newPasscode, usageMinutes: 0 }]);
    setSupervisorPasscodeError("");
  };

  const handleDeleteSupervisorPasscode = (code) => {
    setSupervisorPasscodes(supervisorPasscodes.filter((item) => {
      const itemCode = typeof item === 'string' ? item : item.code;
      return itemCode !== code;
    }));
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (deleteModal.show) cancelDeleteProject();
        if (managePasscodesModal.show) handleCloseManageModal();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [deleteModal.show, managePasscodesModal.show]);

  const projectPasscodes = managePasscodesModal.project 
    ? (appPasscodes[managePasscodesModal.project.id] || [])
    : [];

  const totalPasscodes = Object.values(appPasscodes).reduce((sum, codes) => sum + codes.length, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      setAuthorized(true);
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      setError("");
      setPasscode("");
    } else {
      setError("Invalid passcode. Please try again.");
    }
  };

  const handleSignOut = () => {
    setAuthorized(false);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setPasscode("");
    setError("");
  };

  // Show login form if not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-purple-600 to-amber-600 rounded-3xl opacity-30 blur-xl"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 via-purple-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse-slow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-3 bg-gradient-to-r from-rose-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                Admin Access
              </h1>
              <p className="text-slate-400 text-base">
                Enter the admin passcode to access the dashboard
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Admin Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter admin passcode"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 text-white transition-all duration-300"
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-500/0 via-purple-500/0 to-amber-500/0 focus-within:from-rose-500/10 focus-within:via-purple-500/10 focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none"></div>
                </div>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-shake backdrop-blur-sm">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="relative w-full bg-gradient-to-r from-rose-600 via-purple-600 to-amber-600 hover:from-rose-500 hover:via-purple-500 hover:to-amber-500 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-rose-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
              >
                <span className="relative z-10">Unlock Admin Access</span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-purple-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>
          </div>
        </div>

        <style>{`
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
          .animate-scale-in {
            animation: scale-in 0.3s ease-out;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-rose-600 via-purple-600 to-amber-600 shadow-2xl backdrop-blur-xl border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600/90 via-purple-600/90 to-amber-600/90 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between animate-fade-in-down">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 bg-gradient-to-r from-white via-rose-100 to-amber-100 bg-clip-text text-transparent drop-shadow-2xl">
                Admin Dashboard
              </h1>
              <div className="inline-block text-4xl mb-2 animate-float">🛠️</div>
              <p className="text-rose-100 text-base md:text-lg font-medium tracking-wide">
                Manage projects and app passcodes
              </p>
            </div>
            <nav className="hidden md:flex gap-3">
              <Link
                to="/"
                className="px-5 py-2.5 text-sm font-semibold text-white hover:text-rose-100 transition-all duration-300 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm border border-white/20"
              >
                Home
              </Link>
              <Link
                to="/supervisor"
                className="px-5 py-2.5 text-sm font-semibold text-white hover:text-rose-100 transition-all duration-300 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm border border-white/20"
              >
                Supervisor
              </Link>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 text-sm font-semibold text-white hover:text-rose-100 transition-all duration-300 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-cyan-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Total Projects</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{projects.length}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up delay-100">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Total Passcodes</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{totalPasscodes}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-emerald-400/50 transition-all duration-500 shadow-xl hover:shadow-2xl animate-fade-in-up delay-200">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Active Apps</p>
                <p className="text-4xl font-extrabold text-white bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{projects.length}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Projects Management Section */}
        <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-3xl opacity-10 blur-xl"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Projects Management</h2>
              <p className="text-gray-400 text-sm">Add, edit, and manage your applications</p>
            </div>
            <button
              onClick={() => {
                setShowAddProject(!showAddProject);
                setProjectError("");
              }}
              className="relative flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
              {showAddProject ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Project
                </>
              )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>

          {showAddProject && (
            <div className="relative bg-gradient-to-br from-slate-900/60 to-slate-800/60 rounded-3xl p-6 mb-6 border border-white/10 backdrop-blur-sm animate-fade-in-up">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add New Project
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Title *</label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="Project title"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Path *</label>
                  <input
                    type="text"
                    value={newProject.path}
                    onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                    placeholder="/path/to/project"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white transition-all duration-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Description *</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Project description"
                    rows="3"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white transition-all duration-300 resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Image URL *</label>
                  <input
                    type="text"
                    value={newProject.image}
                    onChange={(e) => setNewProject({ ...newProject, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border-2 border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white transition-all duration-300"
                  />
                </div>
              </div>
              {projectError && (
                <div className="mt-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 animate-shake backdrop-blur-sm">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm font-medium">{projectError}</p>
                </div>
              )}
              <button
                onClick={handleAddProject}
                className="relative mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
              >
                <span className="relative z-10">Save Project</span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          )}

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => {
              const passcodeCount = appPasscodes[project.id]?.length || 0;
              return (
                <div
                  key={project.id}
                  className="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 hover:border-cyan-400/50 transition-all duration-500 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative overflow-hidden">
                    <div className="relative h-44 overflow-hidden">
                      <img 
                        src={project.image} 
                        alt={project.title} 
                        className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute top-4 right-4">
                        <span className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 shadow-lg">
                          {passcodeCount} {passcodeCount === 1 ? 'passcode' : 'passcodes'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                      {project.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {project.description}
                    </p>
                    <p className="text-slate-500 text-xs mb-5 font-mono bg-slate-800/50 px-3 py-2 rounded-lg truncate border border-slate-700/50">
                      {project.path}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleManagePasscodes(project)}
                        className="relative flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Manage
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id, project.title)}
                        className="relative flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-red-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supervisor Passcodes Management Section */}
        <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 mt-8">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-purple-600 to-amber-600 rounded-3xl opacity-10 blur-xl"></div>
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-white mb-2 bg-gradient-to-r from-rose-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                Supervisor Passcodes Management
              </h2>
              <p className="text-slate-400 text-sm">Generate and manage supervisor access passcodes</p>
            </div>
            <button
              onClick={handleAddSupervisorPasscode}
              className="relative flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
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
          
          {supervisorPasscodeError && (
            <div className="relative mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-shake backdrop-blur-sm">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm font-medium">{supervisorPasscodeError}</p>
            </div>
          )}

          <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-left text-slate-300">Passcode</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-right text-slate-300">Usage Time</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-center text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {supervisorPasscodes.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-slate-400 text-center" colSpan="3">
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
                    supervisorPasscodes.map((item) => {
                      const code = typeof item === 'string' ? item : item.code;
                      const usageMinutes = typeof item === 'string' ? 0 : (item.usageMinutes || 0);
                      return (
                        <tr key={code} className="hover:bg-slate-800/40 transition-all duration-300 group/row">
                          <td className="px-6 py-4">
                            <span className="font-mono text-purple-400 bg-purple-500/10 px-4 py-2 rounded-xl text-sm border border-purple-500/20 group-hover/row:bg-purple-500/20 transition-colors">
                              {code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-slate-300 font-semibold bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">{usageMinutes} min</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleDeleteSupervisorPasscode(code)}
                                className="relative bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                              >
                                <span className="relative z-10">Delete</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-red-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                              </button>
                            </div>
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
      </main>

      {/* Delete Project Confirmation Modal */}
      {deleteModal.show && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={cancelDeleteProject}
        >
          <div 
            className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/10 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl opacity-30 blur-xl"></div>
            
            <div className="relative">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mr-4 border border-red-500/30 animate-pulse-slow">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Delete Project
                </h3>
              </div>
              <p className="text-slate-300 mb-8 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-white">"{deleteModal.projectTitle}"</span>? 
                This action cannot be undone and will also remove all associated passcodes.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteProject}
                  className="px-6 py-3 rounded-xl font-semibold bg-slate-700/50 hover:bg-slate-700 text-white transition-all duration-300 transform hover:scale-105 active:scale-95 border border-slate-600/50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="relative px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group"
                >
                  <span className="relative z-10">Delete</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Passcodes Modal */}
      {managePasscodesModal.show && managePasscodesModal.project && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
          onClick={handleCloseManageModal}
        >
          <div 
            className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-6xl w-full p-6 md:p-8 border border-white/10 my-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-3xl opacity-30 blur-xl"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Manage Passcodes
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">
                    {managePasscodesModal.project.title} • {projectPasscodes.length} {projectPasscodes.length === 1 ? 'passcode' : 'passcodes'}
                  </p>
                </div>
                <button
                  onClick={handleCloseManageModal}
                  className="text-slate-400 hover:text-white transition-all duration-300 p-2 hover:bg-slate-700/50 rounded-xl hover:rotate-90 transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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
                      <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide text-center text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {projectPasscodes.length === 0 ? (
                      <tr>
                        <td className="px-6 py-12 text-slate-400 text-center" colSpan="6">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <p className="font-medium">No passcodes yet</p>
                            <p className="text-sm text-slate-500">Supervisors can generate passcodes from the supervisor page</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      projectPasscodes.map((passcode) => {
                        const isEditing = editingPasscode && editingPasscode.code === passcode.code;
                        return (
                          <tr key={passcode.code} className="hover:bg-slate-800/40 transition-all duration-300 group/row">
                            <td className="px-6 py-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingPasscode.name}
                                  onChange={(e) => setEditingPasscode({ ...editingPasscode, name: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border-2 border-slate-600 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white text-sm transition-all duration-300"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-white font-medium group-hover/row:text-cyan-300 transition-colors">{passcode.name || 'N/A'}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-purple-400 bg-purple-500/10 px-4 py-2 rounded-xl text-sm border border-purple-500/20 group-hover/row:bg-purple-500/20 transition-colors">
                                {passcode.code}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isEditing ? (
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editingPasscode.permission}
                                    onChange={(e) => setEditingPasscode({ ...editingPasscode, permission: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-2 transition-all duration-300"
                                  />
                                </label>
                              ) : (
                                <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${passcode.permission ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                  {passcode.permission ? '✓ Yes' : '✗ No'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isEditing ? (
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editingPasscode.paid}
                                    onChange={(e) => setEditingPasscode({ ...editingPasscode, paid: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-2 transition-all duration-300"
                                  />
                                </label>
                              ) : (
                                <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${passcode.paid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                                  {passcode.paid ? '✓ Yes' : '✗ No'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-slate-300 font-semibold bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">{passcode.usageMinutes || 0} min</span>
                            </td>
                            <td className="px-6 py-4">
                              {isEditing ? (
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={handleSavePasscode}
                                    className="relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                                  >
                                    <span className="relative z-10">Save</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                  </button>
                                  <button
                                    onClick={() => setEditingPasscode(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-700/50 hover:bg-slate-700 text-white transition-all duration-300 border border-slate-600/50 transform hover:scale-105 active:scale-95"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => handleEditPasscode(passcode)}
                                    className="relative bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                                  >
                                    <span className="relative z-10">Edit</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePasscode(passcode.code)}
                                    className="relative bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 overflow-hidden group/btn"
                                  >
                                    <span className="relative z-10">Delete</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-red-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                  </button>
                                </div>
                              )}
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
