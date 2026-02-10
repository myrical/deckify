import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "fbcdn.net",
  "fbsbx.com",
  "facebook.com",
];

function isDomainAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some((d) => hostname.endsWith(d));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isDomainAllowed(imageUrl)) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Prism/1.0)" },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("[ImageProxy] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
