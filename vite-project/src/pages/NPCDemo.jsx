import { Unity, useUnityContext } from "react-unity-webgl";
import { Link } from "react-router-dom";

/**
 * Get Unity file URL - uses Direct GCS URLs for optimal performance
 * Browser loads files directly from GCS → loading time < 1 second
 * 
 * @param {string} filename - The Unity file name (e.g., "yes.loader.js", "yes.data.gz")
 * @returns {string} - Full URL to the Unity file
 */
function getUnityFileUrl(filename) {
  // Default GCS bucket (can be overridden via env var)
  const gcsBucket = import.meta.env.VITE_UNITY_GCS_BUCKET || 'metavr-assets';
  
  // Direct GCS URL - Browser loads files directly (fastest option)
  // Files are stored with .gz extension and Content-Encoding: gzip
  const baseUrl = `https://storage.googleapis.com/${gcsBucket}/unity/npc/Build`;
  
  // Return direct GCS URL (keep .gz extension as files are stored with it)
  return `${baseUrl}/${filename}`;
}

export default function NPCDemo() {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    // Direct GCS URLs - Browser loads files directly from GCS
    // This is the fastest option: loading time < 1 second
    // Files are stored with .gz extension and Content-Encoding: gzip in GCS
    loaderUrl: getUnityFileUrl("yes.loader.js"),
    dataUrl: getUnityFileUrl("yes.data.gz"),
    frameworkUrl: getUnityFileUrl("yes.framework.js.gz"),
    codeUrl: getUnityFileUrl("yes.wasm.gz"),
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <header className="w-full py-4 text-center text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-600 shadow-lg">
        🤖 AI NPC Demo
      </header>

      {!isLoaded && (
        <p className="mt-8 text-gray-400">
          Loading Unity... {Math.round(loadingProgression * 100)}%
        </p>
      )}

      <div className="flex-1 w-full flex justify-center items-center p-4">
        <Unity
          unityProvider={unityProvider}
          style={{ width: "80%", height: "80vh", borderRadius: "12px" }}
        />
      </div>

      <Link
        to="/"
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all"
      >
        ⬅ Back to Home
      </Link>
    </div>
  );
}
