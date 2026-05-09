import { NextResponse } from "next/server";

export const runtime = "nodejs";

const INEMAVOX_URL = process.env.INEMAVOX_URL || "http://192.168.2.99:3010";

type LibraryFile = { name: string; path: string };
type LibraryResponse = { files?: LibraryFile[] };

export async function GET() {
  try {
    const r = await fetch(`${INEMAVOX_URL}/api/audio/library?kind=music`);
    if (!r.ok) {
      return NextResponse.json({ error: "library_failed", status: r.status }, { status: 502 });
    }
    const data = (await r.json()) as LibraryResponse;
    const files = data.files ?? [];
    if (files.length === 0) {
      return NextResponse.json({ error: "library_empty" }, { status: 404 });
    }
    const pick = files[Math.floor(Math.random() * files.length)];
    return NextResponse.json({
      name: pick.name,
      streamUrl: `/api/junior/ambient/stream?path=${encodeURIComponent(pick.path)}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "fetch_failed", detail: msg }, { status: 502 });
  }
}
