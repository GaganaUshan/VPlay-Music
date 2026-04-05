import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${q} official audio`);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoCategoryId", "10"); // Music category
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("YouTube API error:", errorBody);
      return NextResponse.json(
        { error: "Failed to fetch from YouTube" },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data.items) {
      console.error("YouTube API returned no items array:", data);
      return NextResponse.json({ results: [] });
    }

    // Safely map results, filtering out any items that don't have a videoId
    const results = data.items
      .filter((item: any) => item.id?.videoId) // Ensure it's a video
      .map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet?.title || "Unknown Title",
        channel: item.snippet?.channelTitle || "Unknown Channel",
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
      }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Search API Critical Error:", error.message, error.stack);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
