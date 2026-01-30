import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) return new NextResponse("No URL provided", { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(targetUrl).origin,
      },
    });

    const data = await response.text();

    // The Magic: We strip the security headers that block the iframe
    return new NextResponse(data, {
      headers: {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Options": "ALLOWALL", // Overwrites the 'SAMEORIGIN' lock
      },
    });
  } catch (error) {
    return new NextResponse("Proxy Error", { status: 500 });
  }
}
