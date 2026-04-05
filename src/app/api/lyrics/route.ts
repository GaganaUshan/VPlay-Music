import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  if (!artist || !title) {
    return NextResponse.json(
      { error: "Artist and title are required" },
      { status: 400 }
    );
  }

  // Clean artist/title by stripping common parenthetical additions
  const cleanArtist = artist
    .replace(/\s*VEVO\s*/gi, "")
    .replace(/\s*-\s*Topic\s*$/i, "")
    .replace(/\s*[(\[].{0,40}?[)\]]/g, "")
    .trim();

  const cleanTitle = title
    .replace(/\s*[(\[].{0,40}?[)\]]/g, "")
    .replace(/\bofficial\b|\baudio\b|\bvideo\b|\blyrics?\b|\bHQ\b|\bHD\b|\bFT\b|\bFEAT\b/gi, "")
    .replace(/\s+-\s+.*/, "") // Remove everything after a dash in title if it exists
    .trim();

  try {
    console.log(`Lyrics search for: "${cleanArtist}" - "${cleanTitle}"`);
    
    // Attempt 1: Cleaned
    const url1 = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const res1 = await fetch(url1, { next: { revalidate: 3600 } });
    
    if (res1.ok) {
      const data = await res1.json();
      if (data.lyrics) return Response.json({ lyrics: data.lyrics, source: "lyrics.ovh" });
    }

    // Attempt 2: Original Title (with cleaned artist)
    const url2 = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(title.replace(/\s*[(\[].{0,40}?[)\]]/g, "").trim())}`;
    const res2 = await fetch(url2);
    if (res2.ok) {
      const data = await res2.json();
      if (data.lyrics) return Response.json({ lyrics: data.lyrics, source: "lyrics.ovh" });
    }

    // Attempt 3: Just the first part of the title
    const simpleTitle = cleanTitle.split(/\s+/)[0];
    if (simpleTitle.length > 3) {
      const url3 = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(simpleTitle)}`;
      const res3 = await fetch(url3);
      if (res3.ok) {
        const data = await res3.json();
        if (data.lyrics) return Response.json({ lyrics: data.lyrics, source: "lyrics.ovh" });
      }
    }

    return NextResponse.json({ lyrics: null, source: null });
  } catch (error) {
    console.error("Lyrics fetch error:", error);
    return NextResponse.json({ lyrics: null, source: null });
  }
}
