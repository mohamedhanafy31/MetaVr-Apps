import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CONFIG, GameConfig, sanitizeConfig } from "@/lib/config";
import { listUploadedImages } from "@/lib/uploads";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

const attachUploads = async (config: GameConfig): Promise<GameConfig> => {
  const uploads = await listUploadedImages();
  return { ...config, customImages: uploads };
};

const readConfigFromDisk = async (): Promise<GameConfig> => {
  try {
    const file = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(file) as Partial<GameConfig>;
    return attachUploads(sanitizeConfig(parsed));
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    return attachUploads(DEFAULT_CONFIG);
  }
};

const writeConfigToDisk = async (config: GameConfig) => {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
};

export async function GET() {
  const config = await readConfigFromDisk();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<GameConfig>;
    const sanitized = sanitizeConfig(payload);
    await writeConfigToDisk({ ...sanitized, customImages: [] });
    const response = await attachUploads(sanitized);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update config", error);
    return NextResponse.json({ error: "Unable to update config" }, { status: 500 });
  }
}

