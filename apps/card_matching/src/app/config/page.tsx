"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import {
  Difficulty,
  MAX_DIFFICULTY_PAIRS,
  MIN_DIFFICULTY_PAIRS,
  getDifficultyById,
  sanitizeDifficulties,
} from "@/constants/difficulty";
import { DEFAULT_CONFIG, GameConfig } from "@/lib/config";
import { AccessCodeGate } from "../../../components/AccessCodeGate";
import { usePageTracking } from "../../../lib/page-tracking";
import { APP_KEY } from "../../../lib/access";

const MAX_IMAGES = 10;

const createDifficulty = (pairs = 6): Difficulty => ({
  id: `diff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: `Custom · ${pairs} pairs`,
  pairs,
});

function ConfigPageContent() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentDifficulties = useMemo(
    () => (config.difficulties.length ? config.difficulties : DEFAULT_CONFIG.difficulties),
    [config.difficulties]
  );

  const duplicatePairs = useMemo(() => {
    const counts = currentDifficulties.reduce<Record<number, number>>((acc, difficulty) => {
      acc[difficulty.pairs] = (acc[difficulty.pairs] ?? 0) + 1;
      return acc;
    }, {});
    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([pairs]) => Number(pairs))
    );
  }, [currentDifficulties]);

  const invalidEvenIds = useMemo(
    () => new Set(currentDifficulties.filter((difficulty) => difficulty.pairs % 2 !== 0).map((difficulty) => difficulty.id)),
    [currentDifficulties]
  );

  const hasDuplicatePairs = duplicatePairs.size > 0;
  const duplicatePairsLabel = hasDuplicatePairs
    ? Array.from(duplicatePairs).sort((a, b) => a - b).join(", ")
    : "";
  const hasOddPairs = invalidEvenIds.size > 0;

  const loadConfig = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      try {
        const response = await fetch("/card-matching/api/config/", { signal: options?.signal });
        if (!response.ok) throw new Error("Failed to load config");
        const data = (await response.json()) as GameConfig;
        if (options?.signal?.aborted) return;
        setConfig(data);
      } catch (error) {
        console.warn(error);
        if (!options?.signal?.aborted) {
          setStatus("error");
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadConfig({ signal: controller.signal });
    return () => controller.abort();
  }, [loadConfig]);

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedImages = config.customImages
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .slice(0, MAX_IMAGES);
    const sanitizedDifficulties = sanitizeDifficulties(config.difficulties);
    const selectedDifficulty = getDifficultyById(
      config.defaultDifficultyId,
      sanitizedDifficulties
    );

    try {
      const response = await fetch("/card-matching/api/config/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          customImages: sanitizedImages,
          difficulties: sanitizedDifficulties,
          defaultDifficultyId: selectedDifficulty.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to save config");
      const saved = (await response.json()) as GameConfig;
      setConfig(saved);
      setStatus("saved");
    } catch (error) {
      console.warn(error);
      setStatus("error");
    }
  };

  const handleRemoveImage = async (index: number) => {
    const target = config.customImages[index];
    if (!target) return;

    const filename = target.split("/").pop();
    if (!filename) {
      setStatus("error");
      return;
    }

    try {
      const response = await fetch(`/card-matching/api/uploads/?name=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete image");
      await loadConfig();
    } catch (error) {
      console.warn(error);
      setStatus("error");
    }
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = MAX_IMAGES - config.customImages.length;
    if (availableSlots <= 0) {
      event.target.value = "";
      return;
    }

    setIsImporting(true);
    setStatus("idle");

    try {
      const selected = Array.from(files).slice(0, availableSlots);
      const uploadedUrls: string[] = [];

      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/card-matching/api/uploads/", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        const body = (await response.json()) as { url?: string };
        if (!body.url) {
          throw new Error("Upload response missing url");
        }
        uploadedUrls.push(body.url);
      }

      setConfig((prev) => ({
        ...prev,
        customImages: [...prev.customImages, ...uploadedUrls],
      }));
    } catch (error) {
      console.warn(error);
      setStatus("error");
    } finally {
      event.target.value = "";
      setIsImporting(false);
      await loadConfig();
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clampPairs = (value: number) => {
    if (!Number.isFinite(value)) return MIN_DIFFICULTY_PAIRS;
    return Math.min(MAX_DIFFICULTY_PAIRS, Math.max(MIN_DIFFICULTY_PAIRS, Math.round(value)));
  };

  const handleDifficultyLabelChange = (id: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      difficulties: prev.difficulties.map((difficulty) =>
        difficulty.id === id ? { ...difficulty, label: value } : difficulty
      ),
    }));
  };

  const handleDifficultyPairsChange = (id: string, value: string) => {
    const numeric = clampPairs(Number(value));
    setConfig((prev) => ({
      ...prev,
      difficulties: prev.difficulties.map((difficulty) =>
        difficulty.id === id ? { ...difficulty, pairs: numeric } : difficulty
      ),
    }));
  };

  const handleRemoveDifficulty = (id: string) => {
    setConfig((prev) => {
      if (prev.difficulties.length === 1) {
        return prev;
      }
      const filtered = prev.difficulties.filter((difficulty) => difficulty.id !== id);
      if (!filtered.length) {
        return prev;
      }
      const nextDefault = filtered.some((diff) => diff.id === prev.defaultDifficultyId)
        ? prev.defaultDifficultyId
        : filtered[0].id;
      return { ...prev, difficulties: filtered, defaultDifficultyId: nextDefault };
    });
  };

  const handleAddDifficulty = () => {
    setConfig((prev) => {
      const existingPairs = new Set(prev.difficulties.map((difficulty) => difficulty.pairs));
      let nextPairs = clampPairs(
        (prev.difficulties[prev.difficulties.length - 1]?.pairs ?? MIN_DIFFICULTY_PAIRS) + 2
      );
      if (nextPairs % 2 !== 0) {
        nextPairs = clampPairs(nextPairs + 1);
      }
      let attempts = 0;
      while (existingPairs.has(nextPairs) && attempts < MAX_DIFFICULTY_PAIRS) {
        nextPairs = clampPairs(nextPairs + 2);
        attempts += 1;
      }
      if (existingPairs.has(nextPairs)) {
        return prev;
      }
      return { ...prev, difficulties: [...prev.difficulties, createDifficulty(nextPairs)] };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-10 text-slate-50">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Settings
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Configure your game</h1>
            <p className="text-slate-300">
              Control which images appear on the board and toggle optional gameplay settings.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:text-emerald-200"
          >
            ← Back to game
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-white">Image library</h2>
              <p className="text-sm text-slate-300">
                Upload up to {MAX_IMAGES} images from this device. Each file becomes a matching pair
                and lives in the shared <code>uploads/</code> directory.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <button
                type="button"
                onClick={triggerFilePicker}
                disabled={config.customImages.length >= MAX_IMAGES || isImporting}
                className="inline-flex items-center justify-center rounded-xl border border-dashed border-emerald-300/60 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-400"
              >
                {isImporting ? "Uploading..." : "+ Upload images"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />

              {config.customImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-slate-800/40 p-4 text-sm text-slate-300">
                  No custom images found. Upload new files above to populate the shared uploads/ library.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {config.customImages.map((url, index) => (
                    <div
                      key={`image-${index}`}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40"
                    >
                      <div className="relative h-48 w-full bg-slate-950/60">
                        <Image
                          src={url}
                          alt={`Uploaded image ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-200">
                        <span className="uppercase tracking-wide">Image #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveImage(index)}
                          className="rounded-lg border border-white/20 px-2 py-1 text-[11px] font-semibold text-white transition hover:border-red-400/60 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Gameplay options</h2>
            <p className="text-sm text-slate-300">
              Tailor the decks, add new levels, and control helpers like the timer.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Levels</p>
                  <p className="text-xs text-slate-400">
                    Choose a label and number of pairs ({MIN_DIFFICULTY_PAIRS}-
                    {MAX_DIFFICULTY_PAIRS}). Add or remove rows to customize what players see.
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {currentDifficulties.map((difficulty) => {
                    const showDuplicateError = duplicatePairs.has(difficulty.pairs);
                    const showOddError = invalidEvenIds.has(difficulty.id);
                    return (
                    <div
                      key={difficulty.id}
                      className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:grid-cols-[1fr_140px_auto]"
                    >
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">
                          Label
                        </label>
                        <input
                          type="text"
                          value={difficulty.label}
                          onChange={(event) =>
                            handleDifficultyLabelChange(difficulty.id, event.target.value)
                          }
                          className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">
                          Pairs
                        </label>
                        <input
                          type="number"
                          min={MIN_DIFFICULTY_PAIRS}
                          max={MAX_DIFFICULTY_PAIRS}
                          value={difficulty.pairs}
                          onChange={(event) =>
                            handleDifficultyPairsChange(difficulty.id, event.target.value)
                          }
                          className={`rounded-lg border bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                            showDuplicateError || showOddError
                              ? "border-red-400/80 focus:ring-red-400/60"
                              : "border-white/10 focus:ring-emerald-400/70"
                          }`}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveDifficulty(difficulty.id)}
                          disabled={currentDifficulties.length === 1}
                          className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                      {(showDuplicateError || showOddError) && (
                        <p className="text-xs font-semibold text-rose-300 sm:col-span-3">
                          {showDuplicateError && "Pair counts must be unique."}{" "}
                          {showOddError && "Pair counts must be even numbers."}
                        </p>
                      )}
                    </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleAddDifficulty}
                    className="inline-flex items-center justify-center rounded-xl border border-dashed border-emerald-300/60 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-200"
                  >
                    + Add level
                  </button>
                  {(hasDuplicatePairs || hasOddPairs) && (
                    <p className="text-sm font-semibold text-rose-300">
                      {hasDuplicatePairs && (
                        <>
                          Each level must use a unique number of pairs. Duplicates:{" "}
                          {duplicatePairsLabel}.{" "}
                        </>
                      )}
                      {hasOddPairs && "Pair counts must be even numbers."}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Default difficulty
                </label>
                <select
                  value={config.defaultDifficultyId}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, defaultDifficultyId: event.target.value }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                >
                  {currentDifficulties.map((difficulty) => (
                    <option key={difficulty.id} value={difficulty.id}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={config.showTimer}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, showTimer: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-slate-900 accent-emerald-400"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Display timer</p>
                  <p className="text-xs text-slate-300">
                    Hide the timer if you prefer a more relaxed pace.
                  </p>
                </div>
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              {hasDuplicatePairs
                ? "Resolve duplicate pair counts before saving."
                : hasOddPairs
                  ? "Pair counts must be even numbers."
                  : status === "saved"
                    ? "Settings saved. Uploads refresh from uploads/ automatically."
                    : status === "error"
                      ? "Unable to save settings. Please try again."
                      : ""}
            </div>
            <button
              type="submit"
              disabled={hasDuplicatePairs || hasOddPairs}
              className={`rounded-xl px-6 py-3 text-sm font-semibold text-slate-900 transition ${
                hasDuplicatePairs || hasOddPairs
                  ? "cursor-not-allowed bg-emerald-400/40"
                  : "bg-emerald-400/90 hover:bg-emerald-300"
              }`}
            >
              Save changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function ConfigPageContentWrapper() {
  const searchParams = useSearchParams();
  const supervisorId = searchParams.get('supervisorId');
  const appId = searchParams.get('appId') || APP_KEY;

  // Track page usage if opened from supervisor portal
  usePageTracking({
    pageId: `app-config-${appId}`,
    pageName: 'Card Matching Config',
    pageType: 'config',
    appId,
    supervisorId: supervisorId || undefined,
    userRole: 'supervisor',
    enabled: !!supervisorId && !!appId,
    metadata: {
      source: 'app-config-page',
      appName: 'Card Matching',
    },
  });

  return (
    <AccessCodeGate requiredRole="supervisor">
      <ConfigPageContent />
    </AccessCodeGate>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    }>
      <ConfigPageContentWrapper />
    </Suspense>
  );
}

