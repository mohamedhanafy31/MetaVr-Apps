import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/backend";

interface ResendPayload {
  email?: string;
  appKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ResendPayload;
    const email = payload.email?.trim();
    const appKey = payload.appKey?.trim();

    if (!email || !appKey) {
      return NextResponse.json(
        { success: false, message: "Both email and appKey are required." },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/user-access/resend-code"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, appKey }),
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? (data as Record<string, string>).message
          : "Failed to resend access code.";

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
    console.error("Resend access code proxy failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to resend access code right now." },
      { status: 500 },
    );
  }
}


