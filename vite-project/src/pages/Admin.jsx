import { useState } from "react";

export default function Admin() {
  const [codes, setCodes] = useState(
    JSON.parse(localStorage.getItem("npcCodes") || "[]")
  );
  const [newCode, setNewCode] = useState("");

  // Add new access code
  const addCode = () => {
    if (!newCode.trim()) return alert("Please enter a code");
    const updated = [...codes, { code: newCode, usageMinutes: 0 }];
    setCodes(updated);
    localStorage.setItem("npcCodes", JSON.stringify(updated));
    setNewCode("");
  };

  // Delete specific code
  const deleteCode = (codeToDelete) => {
    const updated = codes.filter((c) => c.code !== codeToDelete);
    setCodes(updated);
    localStorage.setItem("npcCodes", JSON.stringify(updated));
  };

  // Clear all codes
  const clearAll = () => {
    if (window.confirm("Are you sure you want to delete ALL codes?")) {
      setCodes([]);
      localStorage.removeItem("npcCodes");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-6">Admin Dashboard 🧩</h1>

      <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Manage NPC Access Codes</h2>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Enter new code..."
            className="flex-1 p-2 rounded-lg text-black"
          />
          <button
            onClick={addCode}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold"
          >
            Add
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-2">Code</th>
              <th className="p-2">Usage (min)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-b border-gray-700">
                <td className="p-2">{c.code}</td>
                <td className="p-2">{c.usageMinutes || 0}</td>
                <td className="p-2">
                  <button
                    onClick={() => deleteCode(c.code)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center p-4 text-gray-400">
                  No codes created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button
          onClick={clearAll}
          className="mt-6 bg-red-700 hover:bg-red-800 px-6 py-2 rounded-lg font-semibold"
        >
          Delete All
        </button>
      </div>
    </div>
  );
}
