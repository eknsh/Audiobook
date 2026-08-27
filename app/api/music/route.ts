import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.JAMENDO_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "JAMENDO_CLIENT_ID is missing" },
        { status: 500 }
      );
    }

    const searches = [
      "bollywood",
      "india",
      "hindi",
      "mumbai",
      "indian",
      "desi",
    ];

    const requests = searches.map(async (search) => {
      const url =
        "https://api.jamendo.com/v3.0/tracks" +
        `?client_id=${clientId}` +
        "&format=json" +
        "&limit=20" +
        "&audioformat=mp32" +
        "&order=popularity_total" +
        `&search=${encodeURIComponent(search)}`;

      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return Array.isArray(data.results) ? data.results : [];
    });

    const results = (await Promise.all(requests)).flat();

    const uniqueTracks = Array.from(
      new Map(results.map((track: any) => [track.id, track])).values()
    );

    // Strong Indian / Bollywood filtering
    const indianKeywords = [
      "bollywood",
      "india",
      "indian",
      "hindi",
      "mumbai",
      "bombay",
      "desi",
      "asia",
      "punjabi",
      "bengali",
      "bhangra",
      "tabla",
      "sitar",
      "indian mix",
    ];

    const relevantTracks = uniqueTracks.filter((track: any) => {
      const text = [
        track.name,
        track.artist_name,
        track.album_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return indianKeywords.some((keyword) =>
        text.includes(keyword)
      );
    });

    const tracks = relevantTracks
      .filter((track: any) => track.audio)
      .slice(0, 20)
      .map((track: any) => ({
        id: String(track.id),
        title: track.name || "Indian Retro Track",
        artist: track.artist_name || "Unknown Artist",
        album: track.album_name || "Chai Tapri Bollywood",
        image: track.album_image || "",
        audio: track.audio,
        duration: Number(track.duration) || 0,
        license: track.license_ccurl || "",
      }));

    return NextResponse.json({
      tracks,
      count: tracks.length,
    });
  } catch (error) {
    console.error("Music API error:", error);

    return NextResponse.json(
      { error: "Failed to load music" },
      { status: 500 }
    );
  }
}
