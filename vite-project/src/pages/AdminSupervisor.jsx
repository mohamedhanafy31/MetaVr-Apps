import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "supervisorPasscodes";
const ADMIN_PASSCODE = "31720032025";
const ADMIN_AUTH_KEY = "adminAuthorized";

export default function AdminSupervisor() {
  const [authorized, setAuthorized] = useState(() => {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [passcodes, setPasscodes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passcodes));
  }, [passcodes]);

  const generateRandomPasscode = () => {
    // Generate a random 8-digit number (10000000 to 99999999)
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const handleAdd = () => {
    let newPasscode;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    // Generate a unique passcode
    do {
      newPasscode = generateRandomPasscode();
      attempts++;
      if (attempts >= maxAttempts) {
        setError("Unable to generate unique passcode. Please try again.");
        return;
      }
    } while (passcodes.includes(newPasscode));

    setPasscodes([...passcodes, newPasscode]);
    setError("");
  };

  const handleDelete = (code) => {
    setPasscodes(passcodes.filter((item) => item !== code));
  };

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

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center px-6 relative overflow-hidden">
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
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-purple-600 to-amber-600 rounded-3xl opacity-30 blur-xl"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 via-purple-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse-slow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-3 bg-gradient-to-r from-rose-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                Admin Access Required
              </h1>
              <p className="text-slate-400 text-base">
                Enter the admin passcode to access this page
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Supervisor Passcodes</h1>
          <p className="text-gray-400">
            Create, rotate, or disable supervisor access codes.
          </p>
        </div>
        <Link
          to="/supervisor"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          View Supervisor Page
        </Link>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-10">
        <h2 className="text-2xl font-semibold mb-4">Create passcode</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <p className="text-gray-300 flex-1">
            Click the button below to generate a random 8-digit passcode.
          </p>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2 rounded-md font-semibold whitespace-nowrap"
          >
            Generate Passcode
          </button>
        </div>
        {error && <p className="text-red-400 mt-3">{error}</p>}
      </div>

      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700 text-left">
            <tr>
              <th className="px-6 py-3 font-semibold text-sm uppercase tracking-wide">
                Passcode
              </th>
              <th className="px-6 py-3 font-semibold text-sm uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {passcodes.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-400" colSpan="2">
                  No passcodes yet. Create one above.
                </td>
              </tr>
            ) : (
              passcodes.map((code) => (
                <tr key={code} className="border-t border-gray-700">
                  <td className="px-6 py-4 font-mono">{code}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(code)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

