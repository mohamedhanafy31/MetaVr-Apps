import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  Difficulty,
  sanitizeDifficulties,
} from "@/constants/difficulty";

export type GameConfig = {
  customImages: string[];
  showTimer: boolean;
  defaultDifficultyId: string;
  difficulties: Difficulty[];
};

export const DEFAULT_CONFIG: GameConfig = {
  customImages: [],
  showTimer: true,
  defaultDifficultyId: DEFAULT_DIFFICULTY.id,
  difficulties: DIFFICULTIES.map((difficulty) => ({ ...difficulty })),
};

const sanitizeImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return images
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
};

export const sanitizeConfig = (raw?: Partial<GameConfig> | null): GameConfig => {
  if (!raw) {
    return DEFAULT_CONFIG;
  }

  const difficulties = sanitizeDifficulties(raw.difficulties);
  const defaultDifficultyId =
    difficulties.find((difficulty) => difficulty.id === raw.defaultDifficultyId)?.id ??
    difficulties[0]?.id ??
    DEFAULT_DIFFICULTY.id;

  return {
    customImages: sanitizeImages(raw.customImages),
    showTimer: typeof raw.showTimer === "boolean" ? raw.showTimer : DEFAULT_CONFIG.showTimer,
    defaultDifficultyId,
    difficulties,
  };
};

