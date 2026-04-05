import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");


  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
  }

  try {

    // 2. Fetch Video Info
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Check if video is valid
    if (!ytdl.validateID(videoId)) {
      return NextResponse.json({ error: "Invalid Video ID" }, { status: 400 });
    }

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\x00-\x7F]/g, "") || "download";
    
    // 3. Find the best audio-only format
    const format = ytdl.chooseFormat(info.formats, { 
      quality: "highestaudio", 
      filter: "audioonly" 
    });

    if (!format) {
      return NextResponse.json({ error: "No suitable audio format found" }, { status: 500 });
    }

    // 4. Create Stream
    const audioStream = ytdl(url, { format });

    // Convert Node.js Readable to Web ReadableStream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    audioStream.on("data", (chunk) => {
      writer.write(chunk);
    });

    audioStream.on("end", () => {
      writer.close();
    });

    audioStream.on("error", (err) => {
      console.error("Stream error:", err);
      writer.abort(err);
    });

    // 5. Return Response
    return new Response(readable, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${title}.mp3"`,
        "Cache-Control": "no-cache",
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Download error:", message);
    return NextResponse.json(
      { error: message || "Failed to process download" }, 
      { status: 500 }
    );
  }
}
