import { mkdir, readdir, stat, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BASE_PATH = "/card-matching";
const PUBLIC_PREFIX = `${BASE_PATH}/uploads`;
const IMAGE_PATTERN = /\.(png|jpe?g|webp|gif)$/i;

export const ensureUploadDirExists = async () => {
  await mkdir(UPLOAD_DIR, { recursive: true });
};

const toPublicUrl = (filename: string) => `${PUBLIC_PREFIX}/${filename}`;

const sanitizeFilename = (value: string) => path.basename(value);

export const listUploadedImages = async (): Promise<string[]> => {
  await ensureUploadDirExists();
  const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && IMAGE_PATTERN.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(UPLOAD_DIR, entry.name);
        const stats = await stat(filePath);
        return {
          name: entry.name,
          mtimeMs: stats.mtimeMs,
        };
      })
  );

  return files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((file) => toPublicUrl(file.name));
};

export const deleteUploadedImage = async (identifier: string) => {
  await ensureUploadDirExists();
  const filename = sanitizeFilename(identifier);
  const filePath = path.join(UPLOAD_DIR, filename);
  await unlink(filePath);
};

export const getUploadPaths = () => ({
  uploadDir: UPLOAD_DIR,
  publicPrefix: PUBLIC_PREFIX,
});

