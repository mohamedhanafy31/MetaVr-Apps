import React, { useEffect, useRef, useState } from "react";

const ArFaceMaskJeeliz = () => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const [frameImage, setFrameImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState("glasses");
  const [jeelizReady, setJeelizReady] = useState(false);
  const [modelsConfigLoaded, setModelsConfigLoaded] = useState(false);

  // helper to load external JS files in order
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      // if already loaded, resolve immediately
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // install onJeelizReady BEFORE calling/starting Jeeliz so main.js can call it
        window.onJeelizReady = () => {
          if (!mounted) return;
          console.log("onJeelizReady called");
          setJeelizReady(true);
          // If there was a saved selection, call switch now (safe because main will queue if needed).
          if (window._initialModelSelection) {
            const m = window._initialModelSelection;
            setSelectedModel(m);
            if (window.switchJeelizModel) window.switchJeelizModel(m);
            window._initialModelSelection = null;
          }
        };

        // 1) load core libs
        await loadScript("/libs/three/three.js");
        await loadScript("/libs/helpers/JeelizThreeHelper.js");
        await loadScript("/libs/helpers/JeelizResizer.js");
        await loadScript("/libs/jeelizFaceFilter/jeelizFaceFilter.js");

        // 2) load modelsConfig and the glasses creator (they should define window.JeelizModelsConfig and JeelizThreeGlassesCreator)
        await loadScript("/demos/threejs/glassesVTO/modelsConfig.js");
        setModelsConfigLoaded(true);
        await loadScript("/demos/threejs/glassesVTO/JeelizThreeGlassesCreator.js");

        // 3) load main.js (which uses Jeeliz helper)
        await loadScript("/demos/threejs/glassesVTO/main.js");

        // 4) start the engine (main) AFTER we've loaded everything
        if (window.main) {
          // if user already selected a model via UI before ready, stash it in _initialModelSelection
          window._initialModelSelection = selectedModel;
          window.main();
        } else {
          console.warn("window.main not found");
        }
      } catch (err) {
        console.error("Script load/init error", err);
      }
    };

    init();

    return () => {
      mounted = false;
      // remove callback
      try { window.onJeelizReady = null; } catch (e) {}
    };
  }, []); // run once

  useEffect(() => {
    // whenever user chooses a model through UI, call switchJeelizModel
    // if switchJeelizModel isn't yet present, save to window._initialModelSelection
    if (window.switchJeelizModel) {
      window.switchJeelizModel(selectedModel);
    } else {
      window._initialModelSelection = selectedModel;
    }
  }, [selectedModel]);

  const handleSelectModel = (modelKey) => {
    setSelectedModel(modelKey);
    // switch will be triggered by useEffect above
  };

  // Take picture including the frame
  const handleTakePicture = () => {
    const canvas = document.getElementById("jeeFaceFilterCanvas");
    if (!canvas) return;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const ctx = offCanvas.getContext("2d");

    ctx.drawImage(canvas, 0, 0);

    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, canvas.width, canvas.height);
    }

    const dataURL = offCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "jeeliz_capture.png";
    link.click();
  };

  const handleImportFrame = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFrameImage(url);
  };

  // render the selector only when both modelsConfig and jeeliz are ready
  const showSelector = modelsConfigLoaded && jeelizReady && window.JeelizModelsConfig;

  return (
    <div className="flex flex-col items-center mt-10 gap-4">
      {/* Model selector appears ONLY when modelsConfig + Jeeliz are ready */}
      {showSelector ? (
        <div className="flex gap-4 mb-4">
          {Object.entries(window.JeelizModelsConfig || {}).map(([key, model]) => (
            <button
              key={key}
              onClick={() => handleSelectModel(key)}
              className={`flex flex-col items-center border rounded-lg p-2 transition ${
                selectedModel === key ? "bg-blue-100 border-blue-400" : "hover:bg-gray-100"
              }`}
            >
              <img
                src={model.thumbnail}
                alt={model.label}
                className="w-20 h-20 object-contain mb-1"
              />
              <span>{model.label}</span>
            </button>
          ))}
        </div>
      ) : (
        // optional: show a simple loading hint
        <div style={{ minHeight: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: "#666" }}>
            Initializing AR...
          </div>
        </div>
      )}

      {/* Webcam + frame */}
      <div className="relative w-full max-w-xl">
        <canvas
          ref={canvasRef}
          id="jeeFaceFilterCanvas"
          width={600}
          height={600}
          style={{ width: "100%", height: "auto", borderRadius: "1rem" }}
        />
        {frameImage && (
          <img
            ref={frameRef}
            src={frameImage}
            alt="frame overlay"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              borderRadius: "1rem",
            }}
          />
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          onClick={handleTakePicture}
        >
          Take Picture
        </button>

        <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg cursor-pointer transition">
          Import Frame
          <input
            type="file"
            accept="image/*"
            onChange={handleImportFrame}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};

export default ArFaceMaskJeeliz;
