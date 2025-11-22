import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/backend";

interface VerifyPayload {
  code?: string;
  appKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VerifyPayload;
    const code = payload.code?.trim();
    const appKey = payload.appKey?.trim();

    if (!code || !appKey) {
      return NextResponse.json(
        { success: false, message: "Both code and appKey are required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/auth/access-codes/check"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, appKey }),
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? (data as Record<string, string>).message
          : "Failed to verify access code.";

      return NextResponse.json(
        {
          success: false,
          message,
          ...(typeof data === "object" && data !== null ? data : {}),
        },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Access code verification proxy failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify access code right now." },
      { status: 500 },
    );
  }
}

