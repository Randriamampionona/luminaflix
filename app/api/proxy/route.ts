import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new Response("Missing URL", { status: 400 });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0",
        Referer: new URL(url).origin,
      },
    });

    const body = await response.text();

    return new Response(body, {
      headers: {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*", // This fixes your CORS error
        "Content-Security-Policy": "frame-ancestors *", // This allows iframes
      },
    });
  } catch (e) {
    return new Response("Proxy Error", { status: 500 });
  }
}
