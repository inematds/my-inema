import { NextResponse } from "next/server";

export const runtime = "nodejs";

const INEMAVOX_URL = process.env.INEMAVOX_URL || "http://192.168.2.99:3010";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path || !path.startsWith("jobs/audio_library/")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  const upstream = await fetch(
    `${INEMAVOX_URL}/api/audio/file?path=${encodeURIComponent(path)}`,
  );
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "audio_unavailable" }, { status: 502 });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
