import { NextResponse } from "next/server";

const PLAYLIST_ID = "PLZtUdS_3rdhM";

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "YOUTUBE_API_KEY is missing",
        },
        { status: 500 }
      );
    }

    const url = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );

    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", PLAYLIST_ID);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    // IMPORTANT:
    // Return Google's actual error so we can diagnose it.
    if (!response.ok) {
      console.error("YouTube API ERROR:", data);

      return NextResponse.json(
        {
          error: "YouTube API request failed",
          googleError: data,
        },
        { status: response.status }
      );
    }

    const songs = (data.items ?? [])
      .map((item: any, index: number) => {
        const videoId = item.snippet?.resourceId?.videoId;

        if (!videoId) return null;

        return {
          id: videoId,
          title: item.snippet?.title ?? "Unknown song",
          channel: item.snippet?.videoOwnerChannelTitle ?? "",
          thumbnail:
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          position: item.snippet?.position ?? index,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      playlistId: PLAYLIST_ID,
      count: songs.length,
      songs,
    });
  } catch (error) {
    console.error("YouTube route error:", error);

    return NextResponse.json(
      {
        error: "Failed to load YouTube playlist",
      },
      { status: 500 }
    );
  }
}