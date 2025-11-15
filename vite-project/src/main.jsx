import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import AdminNPC from "./pages/AdminNPC";
import AdminHome from "./pages/AdminHome"; // ✅ FIX: import it properly
import AdminSupervisor from "./pages/AdminSupervisor";
import RAGChat from "./pages/RAGChat";
import BackgroundReplacer from "./pages/BackgroundReplacer";
import "./index.css";
import ArFaceMask from "./pages/ArFaceMask";
import Supervisor from "./pages/Supervisor";

function Placeholder({ title }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">{title}</h1>
      <p className="text-gray-400 mb-8">
        Unity WebGL build will appear here soon.
      </p>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all"
      >
        ⬅ Back to Home
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Home */}
        <Route path="/" element={<Home />} />

        {/* ✅ Admin area */}
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/npc" element={<AdminNPC />} />
        <Route path="/admin/supervisor" element={<AdminSupervisor />} />

        {/* ✅ Other routes */}
		<Route path="/ar-face-mask" element={<ArFaceMask />} />

        <Route
          path="/racing"
          element={<Placeholder title="🏎️ 3D Racing Game" />}
        />
        <Route
          path="/vr-sim"
          element={<Placeholder title="🕶️ VR Simulation" />}
        />
        <Route
          path="/npc/"
          element={<Placeholder title="🤖 AI NPC Demo" />}
        />
        <Route path="/rag-chat" element={<RAGChat />} />
        <Route path="/background-replacer" element={<BackgroundReplacer />} />
        <Route path="/supervisor" element={<Supervisor />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
