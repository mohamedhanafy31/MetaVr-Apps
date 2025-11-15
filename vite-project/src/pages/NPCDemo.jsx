import { Unity, useUnityContext } from "react-unity-webgl";
import { Link } from "react-router-dom";

export default function NPCDemo() {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: "/unity/npc/Build/npc.loader.js",
    dataUrl: "/unity/npc/Build/npc.data",
    frameworkUrl: "/unity/npc/Build/npc.framework.js",
    codeUrl: "/unity/npc/Build/npc.wasm",
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
