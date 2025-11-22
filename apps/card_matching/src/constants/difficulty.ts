export type Difficulty = {
  id: string;
  label: string;
  pairs: number;
};

export const MIN_DIFFICULTY_PAIRS = 2;
export const MAX_DIFFICULTY_PAIRS = 15;

export const DIFFICULTIES: Difficulty[] = [
  { id: "starter", label: "Starter · 6 pairs", pairs: 6 },
  { id: "challenger", label: "Challenger · 8 pairs", pairs: 8 },
  { id: "master", label: "Master · 10 pairs", pairs: 10 },
];

export const DEFAULT_DIFFICULTY = DIFFICULTIES[0];

const generateDifficultyId = () => `diff-${Math.random().toString(36).slice(2, 10)}`;

const clampPairs = (value: number) => {
  if (!Number.isFinite(value)) return MIN_DIFFICULTY_PAIRS;
  return Math.min(MAX_DIFFICULTY_PAIRS, Math.max(MIN_DIFFICULTY_PAIRS, Math.round(value)));
};

const ensureEven = (value: number) => {
  if (value % 2 === 0) return value;
  if (value < MAX_DIFFICULTY_PAIRS) return value + 1;
  if (value > MIN_DIFFICULTY_PAIRS) return value - 1;
  return value;
};

export const sanitizeDifficulties = (list?: Difficulty[]): Difficulty[] => {
  if (!Array.isArray(list)) {
    return DIFFICULTIES.map((difficulty) => ({ ...difficulty }));
  }

  const sanitized: Difficulty[] = [];
  const usedPairs = new Set<number>();

  list.forEach((item) => {
    if (!item) return;
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : `Level ${sanitized.length + 1}`;
    const pairs = ensureEven(clampPairs(Number(item.pairs)));
    if (usedPairs.has(pairs)) {
      return;
    }
    usedPairs.add(pairs);
    let id =
      typeof item.id === "string" && item.id.trim() ? item.id.trim() : generateDifficultyId();

    while (sanitized.some((existing) => existing.id === id)) {
      id = generateDifficultyId();
    }

    sanitized.push({
      id,
      label,
      pairs,
    });
  });

  return sanitized.length ? sanitized : DIFFICULTIES.map((difficulty) => ({ ...difficulty }));
};

export const createDifficulty = (label: string, pairs: number): Difficulty => ({
  id: generateDifficultyId(),
  label: label.trim() || `Level ${pairs}`,
  pairs: ensureEven(clampPairs(pairs)),
});

export const getDifficultyById = (id: string, source: Difficulty[] = DIFFICULTIES) =>
  source.find((difficulty) => difficulty.id === id) ?? source[0];

