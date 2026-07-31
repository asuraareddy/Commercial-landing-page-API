import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { pagesConfig } from "@/config/pages";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

// In-memory cache for serverless instance lifetime
let inMemoryConfig: any = null;

export async function GET() {
  if (inMemoryConfig) {
    return NextResponse.json(inMemoryConfig);
  }

  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    inMemoryConfig = JSON.parse(data);
    return NextResponse.json(inMemoryConfig);
  } catch (error) {
    console.warn("Could not read config.json, returning default pagesConfig:", error);
    return NextResponse.json(pagesConfig);
  }
}

export async function POST(request: Request) {
  try {
    const newConfig = await request.json();
    inMemoryConfig = newConfig;

    try {
      await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
      await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    } catch (fsError) {
      console.warn("Could not write config.json to disk (serverless environment):", fsError);
    }

    return NextResponse.json({ success: true, message: "Configuration saved successfully", config: newConfig });
  } catch (error) {
    console.error("Failed to save configuration:", error);
    return NextResponse.json({ success: false, error: "Failed to save configuration" }, { status: 500 });
  }
}
