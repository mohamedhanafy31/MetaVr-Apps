import { Unity, useUnityContext } from "react-unity-webgl";
import { Link } from "react-router-dom";

/**
 * Get Unity file URL - uses GCS if bucket is configured, otherwise uses local path
 * @param {string} filename - The Unity file name (e.g., "yes.loader.js", "yes.data")
 * @returns {string} - Full URL to the Unity file
 */
function getUnityFileUrl(filename) {
  const gcsBucket = import.meta.env.VITE_UNITY_GCS_BUCKET;
  
  if (gcsBucket) {
    // Use GCS bucket URL
    // Note: Files are uploaded without .gz extension but with Content-Encoding: gzip
    // So yes.data.gz becomes yes.data, yes.wasm.gz becomes yes.wasm, etc.
    const baseUrl = `https://storage.googleapis.com/${gcsBucket}/unity/npc/Build`;
    
    // Remove .gz extension if present (GCS files are stored without .gz but with gzip encoding)
    const cleanFilename = filename.replace(/\.gz$/, '');
    
    return `${baseUrl}/${cleanFilename}`;
  }
  
  // Fallback to local path (served by nginx)
  return `/unity/npc/Build/${filename}`;
}

export default function NPCDemo() {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    // Use GCS URLs if VITE_UNITY_GCS_BUCKET is set, otherwise use local paths
    // Note: GCS files are stored without .gz extension (yes.data, yes.wasm, etc.)
    // but with Content-Encoding: gzip, so we pass the original filenames and
    // getUnityFileUrl will handle the conversion
    loaderUrl: getUnityFileUrl("yes.loader.js"),
    dataUrl: getUnityFileUrl("yes.data.gz"),      // Will become yes.data in GCS
    frameworkUrl: getUnityFileUrl("yes.framework.js.gz"), // Will become yes.framework.js in GCS
    codeUrl: getUnityFileUrl("yes.wasm.gz"),      // Will become yes.wasm in GCS
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
