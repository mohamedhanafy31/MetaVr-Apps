import { useState, useEffect } from "react";

export default function BackgroundReplacer() {
  const [backgrounds, setBackgrounds] = useState([]);
  const [selected, setSelected] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Fetch available background images from backend
  useEffect(() => {
    fetch("http://127.0.0.1:5000/backgrounds")
      .then((res) => res.json())
      .then((data) => setBackgrounds(data.backgrounds || []))
      .catch((err) => console.error("Failed to load backgrounds:", err));
  }, []);

  const handleSelectBackground = (bg) => {
    setSelected(bg);
    // Update video stream URL dynamically
    setVideoUrl(`http://127.0.0.1:5000/video?background=${bg}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-6">🎥 Live Background Replacer</h1>

      {/* Background Selector */}
      <h2 className="text-2xl font-semibold mb-4">Choose a Background</h2>
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {backgrounds.map((bg, i) => (
          <div
            key={i}
            className={`cursor-pointer border-4 rounded-xl overflow-hidden w-32 h-20 ${
              selected === bg ? "border-purple-500" : "border-transparent"
            }`}
            onClick={() => handleSelectBackground(bg)}
          >
            <img
              src={`http://127.0.0.1:5000/static/backgrounds/${bg}`}
              alt={bg}
              className="object-cover w-full h-full"
            />
          </div>
        ))}
      </div>

      {/* Video Feed */}
      {selected ? (
        <div className="w-full max-w-3xl border-4 border-purple-600 rounded-2xl overflow-hidden shadow-lg">
          <img
            src={videoUrl}
            alt="Live video stream"
            className="w-full h-auto"
          />
        </div>
      ) : (
        <p className="text-gray-400 mt-10">
          👆 Select a background above to start your live stream
        </p>
      )}
    </div>
  );
}
