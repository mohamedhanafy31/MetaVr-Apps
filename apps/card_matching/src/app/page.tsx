"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DIFFICULTY, Difficulty, getDifficultyById } from "@/constants/difficulty";
import { DEFAULT_CONFIG, GameConfig } from "@/lib/config";
import { AccessCodeGate, useAccessContext } from "../../components/AccessCodeGate";
import { usePageTracking } from "../../lib/page-tracking";
import { APP_KEY } from "../../lib/access";
import { useAppLogger } from "../../lib/logger";

type Card = {
  id: number;
  value: string;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const PLACEHOLDER_SEEDS = [
  "aurora",
  "tide",
  "ember",
  "galaxy",
  "meadow",
  "storms",
  "desert",
  "lagoon",
  "nebula",
  "peaks",
  "sunset",
  "waves",
];

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

const getCardImageSize = (pairs: number) => {
  if (pairs <= 6) return 600;
  if (pairs <= 8) return 480;
  return 360;
};

const getCardSizesAttr = (columns: number) => {
  if (columns >= 6) return "(min-width: 1024px) 160px, (min-width: 640px) 28vw, 45vw";
  if (columns === 5) return "(min-width: 1024px) 200px, (min-width: 640px) 32vw, 52vw";
  return "(min-width: 1024px) 240px, (min-width: 640px) 38vw, 65vw";
};

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const sanitizeImages = (images: string[]) => {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  images.forEach((url) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    sanitized.push(trimmed);
  });

  return sanitized;
};

type DeckOptions = {
  deterministic?: boolean;
};

type ResetOptions = DeckOptions & {
  reason?: string;
};

const pickImageUrls = (
  pairs: number,
  customImages: string[],
  imageSize: number,
  options?: DeckOptions
) => {
  const sanitized = sanitizeImages(customImages);
  if (sanitized.length >= pairs) {
    return sanitized.slice(0, pairs);
  }

  const urls = [...sanitized];
  let fallbackIndex = 0;

  while (urls.length < pairs) {
    const seed = PLACEHOLDER_SEEDS[fallbackIndex % PLACEHOLDER_SEEDS.length];
    const suffix = options?.deterministic ? `static-${fallbackIndex}` : randomSuffix();
    urls.push(`https://picsum.photos/seed/${seed}-${suffix}/${imageSize}/${imageSize}`);
    fallbackIndex += 1;
  }

  return urls;
};

const buildDeck = (pairs: number, customImages: string[], options?: DeckOptions): Card[] => {
  const imageSize = getCardImageSize(pairs);
  const images = pickImageUrls(pairs, customImages, imageSize, options);

  const duplicated = images.flatMap((imageUrl, index) => {
    const value = `pair-${index}`;
    const entries = [
      {
        id: index * 2,
        value,
        imageUrl,
      },
      {
        id: index * 2 + 1,
        value,
        imageUrl,
      },
    ];
    return entries;
  });

  const ordered = options?.deterministic
    ? duplicated
    : duplicated.sort(() => Math.random() - 0.5);

  return ordered.map((card, index) => ({
    id: index,
    value: card.value,
    imageUrl: card.imageUrl,
    isFlipped: false,
    isMatched: false,
  }));
};

function HomeContent() {
  const defaultDifficulty = DEFAULT_DIFFICULTY;
  const accessContext = useAccessContext();
  const activeAppId = accessContext.appId || APP_KEY;
  const logger = useAppLogger('CardMatchingApp');

  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [cards, setCards] = useState<Card[]>(() =>
    buildDeck(defaultDifficulty.pairs, DEFAULT_CONFIG.customImages, { deterministic: true })
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [status, setStatus] = useState<"ready" | "playing" | "won">("ready");
  const [isBusy, setIsBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [wrongMatchCards, setWrongMatchCards] = useState<Set<number>>(new Set());
  const [justMatchedCards, setJustMatchedCards] = useState<Set<number>>(new Set());
  const startTimeRef = useRef<number | null>(null);

  usePageTracking({
    pageId: `card-matching-${activeAppId}-play`,
    pageName: "Card Matching Experience",
    pageType: "app",
    appId: activeAppId,
    supervisorId: accessContext.supervisorId,
    userId: accessContext.userId,
    userEmail: accessContext.userEmail,
    userRole: accessContext.role ?? undefined,
    enabled: accessContext.role === "user" && Boolean(accessContext.userId && accessContext.supervisorId),
    metadata: {
      source: "card-matching-app",
      appName: "Card Matching",
    },
  });

  const gridColumns = useMemo(() => {
    if (difficulty.pairs <= 6) return 4;
    if (difficulty.pairs <= 8) return 5;
    return 6;
  }, [difficulty.pairs]);

  const cardSizesAttr = useMemo(() => getCardSizesAttr(gridColumns), [gridColumns]);
  const remainingPairs = Math.max(difficulty.pairs - matches, 0);
  const statusMessage =
    status === "won"
      ? "All pairs cleared! Take a breath and try a tougher board."
      : status === "playing"
        ? `Keep matching — ${remainingPairs} pair${remainingPairs === 1 ? "" : "s"} left.`
        : "Choose a difficulty, then start a fresh round when you’re ready.";
  const helperMessage =
    status === "won"
      ? "Great job! Every pair is matched. Ready for a tougher round?"
      : "Want more of a challenge? Increase the difficulty above and press Start new round.";

  const availableDifficulties = useMemo(() => {
    if (config.difficulties.length) {
      return config.difficulties;
    }
    return DEFAULT_CONFIG.difficulties;
  }, [config.difficulties]);

  const resetGame = useCallback(
    (level: Difficulty, nextConfig: GameConfig, options?: ResetOptions) => {
      const { reason, ...deckOptions } = options || {};
      setCards(buildDeck(level.pairs, nextConfig.customImages, deckOptions));
      setFlipped([]);
      setMoves(0);
      setMatches(0);
      setStatus("ready");
      setIsBusy(false);
      setElapsed(0);
      setLoadedImages({});
      setWrongMatchCards(new Set());
      setJustMatchedCards(new Set());
      startTimeRef.current = null;

      logger.info('game_reset', {
        data: {
          reason: reason || 'system',
          difficultyId: level.id,
          pairs: level.pairs,
          customImages: nextConfig.customImages.length,
        },
      });
    },
    [logger]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const response = await fetch("/card-matching/api/config/");
        if (!response.ok) throw new Error("Failed to load config");
        const storedConfig = (await response.json()) as GameConfig;
        if (!isMounted) return;
        const storedDifficulty = getDifficultyById(
          storedConfig.defaultDifficultyId,
          storedConfig.difficulties
        );
        setConfig(storedConfig);
        setDifficulty(storedDifficulty);
        setCards(buildDeck(storedDifficulty.pairs, storedConfig.customImages));
        logger.info('config_loaded', {
          data: {
            defaultDifficulty: storedConfig.defaultDifficultyId,
            customImages: storedConfig.customImages.length,
          },
        });
      } catch (error) {
        console.warn(error);
        logger.error('config_load_failed', error);
      }
    };
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [logger]);

  useEffect(() => {
    if (status === "playing" && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (status !== "playing" || startTimeRef.current === null) return;
    const interval = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Date.now() - startTimeRef.current);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [status]);

  const handleCardClick = (index: number) => {
    if (isBusy) return;
    const card = cards[index];
    if (card.isMatched || card.isFlipped) return;

    const updatedCards = cards.map((current, idx) =>
      idx === index ? { ...current, isFlipped: true } : current
    );

    if (status === "ready") {
      setStatus("playing");
      logger.info('game_started', {
        data: {
          difficultyId: difficulty.id,
          pairs: difficulty.pairs,
        },
      });
    }

    if (flipped.length === 0) {
      setCards(updatedCards);
      setFlipped([index]);
      logger.debug('card_flip', {
        data: {
          cardId: card.id,
          value: card.value,
          stage: 'first',
        },
      });
      return;
    }

    if (flipped.length === 1) {
      setCards(updatedCards);
      const firstIndex = flipped[0];
      const firstCard = updatedCards[firstIndex];
      const secondCard = updatedCards[index];

      const projectedMoves = moves + 1;
      setMoves((prev) => prev + 1);

      logger.debug('card_flip', {
        data: {
          cardId: secondCard.id,
          value: secondCard.value,
          stage: 'second',
          firstCardId: firstCard.id,
        },
      });

      if (firstCard.value === secondCard.value) {
        // Correct match - trigger success animation
        setJustMatchedCards(new Set([firstIndex, index]));
        setTimeout(() => {
          setJustMatchedCards(new Set());
        }, 600);

        const matchedCards = updatedCards.map((current, idx) =>
          idx === firstIndex || idx === index
            ? { ...current, isMatched: true }
            : current
        );
        setCards(matchedCards);
        setFlipped([]);
        setMatches((prev) => {
          const total = prev + 1;
          if (total === difficulty.pairs) {
            setStatus("won");
            setElapsed((prevElapsed) =>
              startTimeRef.current ? Date.now() - startTimeRef.current : prevElapsed
            );
            const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : elapsed;
            logger.info('game_completed', {
              data: {
                difficultyId: difficulty.id,
                moves: projectedMoves,
                elapsedMs,
              },
            });
          } else {
            logger.info('pair_matched', {
              data: {
                value: firstCard.value,
                matches: total,
                remainingPairs: difficulty.pairs - total,
                moves: projectedMoves,
              },
            });
          }
          return total;
        });
        return;
      }

      // Wrong match - trigger shake animation
      setWrongMatchCards(new Set([firstIndex, index]));
      setFlipped([firstIndex, index]);
      setIsBusy(true);
      logger.debug('match_failed', {
        data: {
          firstCardId: firstCard.id,
          secondCardId: secondCard.id,
          value: firstCard.value,
          moves: projectedMoves,
        },
      });
      setTimeout(() => {
        setWrongMatchCards(new Set());
        setCards((current) =>
          current.map((existing, idx) =>
            idx === firstIndex || idx === index
              ? { ...existing, isFlipped: false }
              : existing
          )
        );
        setFlipped([]);
        setIsBusy(false);
      }, 800);
    }
  };

  const handleRestart = () => resetGame(difficulty, config, { reason: 'manual' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-50">
      <main className="mx-auto flex max-w-7xl flex-col gap-10 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-900/20 backdrop-blur">
        <header className="w-full rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/90 p-6 shadow-inner shadow-black/20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
            MetaVR · Memory Trainer
          </div>
          <div className="mt-4 space-y-3">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              Flip, match, and sharpen your memory
            </h1>
            <p className="text-base text-slate-200">
              Tap two cards to reveal what&apos;s underneath. Keep track of your moves and time—finish the board with the fewest flips you can. Every round reshuffles for a fresh challenge.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[3fr_1fr]">
          <div className="flex flex-col gap-6">
            <div
              className="grid gap-5 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8"
              style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
            >
              {cards.map((card, index) => {
                const isWrongMatch = wrongMatchCards.has(index);
                const isJustMatched = justMatchedCards.has(index);
                const animationClass = isWrongMatch
                  ? "card-wrong-match"
                  : isJustMatched
                    ? "card-correct-match"
                    : card.isMatched
                      ? "card-just-matched"
                      : "";

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`group aspect-square overflow-hidden rounded-2xl border text-3xl font-semibold transition-transform duration-300 ${animationClass} ${
                      card.isMatched
                        ? "border-emerald-400/60 bg-emerald-400/20 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                        : card.isFlipped
                          ? "border-white/50 bg-white/20 text-white"
                          : "border-white/10 bg-slate-800/60 text-transparent hover:border-white/40 hover:bg-slate-800"
                    }`}
                    onClick={() => handleCardClick(index)}
                    disabled={card.isMatched || isBusy}
                    aria-label={card.isMatched ? "Matched card" : "Hidden card"}
                  >
                  <span
                    className="relative block h-full w-full rounded-2xl"
                    style={{ perspective: "1200px" }}
                  >
                    <span
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        transform: card.isFlipped || card.isMatched ? "rotateY(0deg)" : "rotateY(180deg)",
                        transition: "transform 400ms ease",
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-slate-950/60">
                        <div className="relative h-full w-full p-2">
                          <div
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse ${
                              loadedImages[card.imageUrl] ? "opacity-0" : "opacity-100"
                            } transition-opacity duration-500`}
                          />
                          <Image
                            src={card.imageUrl}
                            alt={`Memory card ${card.value}`}
                            fill
                            sizes={cardSizesAttr}
                            quality={85}
                            className={`object-contain transition-opacity duration-500 ${
                              loadedImages[card.imageUrl] ? "opacity-100" : "opacity-0"
                            }`}
                            priority={card.isMatched}
                            onLoadingComplete={() =>
                              setLoadedImages((prev) => ({
                                ...prev,
                                [card.imageUrl]: true,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </span>
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-800/60 text-5xl sm:text-6xl font-semibold text-white"
                      style={{
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        transform: card.isFlipped || card.isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
                        transition: "transform 400ms ease",
                      }}
                    >
                      ?
                    </span>
                  </span>
                  {isJustMatched && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <span className="text-5xl sm:text-6xl animate-[sparkle_0.6s_ease-out]">✨</span>
                    </span>
                  )}
                </button>
              );
              })}
            </div>
            <p
              className={`text-center text-sm font-medium ${
                status === "won" ? "text-emerald-300" : "text-slate-300"
              }`}
            >
              {helperMessage}
            </p>
          </div>

          <aside className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 lg:sticky lg:top-8 lg:h-fit lg:justify-self-end">
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-4">
                <div className="flex flex-col gap-3 border-b border-white/5 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Difficulty
                  </p>
                  <div
                    className="flex flex-col gap-2"
                    role="group"
                    aria-label="Select difficulty"
                  >
                    {availableDifficulties.map((level) => {
                      const isActive = difficulty.id === level.id;
                      return (
                        <button
                          key={level.id}
                          type="button"
                          className={`w-full rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 ${
                            isActive
                              ? "border-emerald-400/70 bg-emerald-400/20 text-white"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/40 hover:text-white"
                          }`}
                          aria-pressed={isActive}
                          onClick={() => {
                            if (!isActive) {
                              setDifficulty(level);
                              resetGame(level, config, { reason: 'difficulty-change' });
                            }
                          }}
                        >
                          {level.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="mt-2 w-full inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    Start new round
                  </button>
                </div>
                <p className="mt-4 text-xs text-slate-300">{statusMessage}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live stats</p>
                <div
                  className={`mt-4 grid gap-2.5 ${
                    config.showTimer ? "grid-cols-3" : "grid-cols-2"
                  }`}
                >
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-300 truncate">Moves</p>
                    <p className="text-xl font-semibold text-white truncate">{moves}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-300 truncate">Matches</p>
                    <p className="text-xl font-semibold text-white truncate">
                      {matches}/{difficulty.pairs}
                    </p>
                  </div>
                  {config.showTimer && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-300 truncate">Time</p>
                      <p className="text-xl font-semibold text-white truncate">
                        {formatTime(status === "ready" ? 0 : elapsed)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">How to play</p>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-emerald-300">
                      1
                    </span>
                    <p className="text-sm">
                      Flip two cards at a time to reveal the artwork underneath.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-emerald-300">
                      2
                    </span>
                    <p className="text-sm">
                      Matched pairs stay face-up; mismatches flip back after a quick pause.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-emerald-300">
                      3
                    </span>
                    <p className="text-sm">
                      Clear the board in the fewest moves and fastest time to set a new personal best.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AccessCodeGate requiredRole="user">
      <HomeContent />
    </AccessCodeGate>
  );
}
