
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      request.nextUrl.searchParams.get(
        "url"
      );

    if (!url) {
      return NextResponse.json(
        {
          error: "Missing Spotify URL",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Spotify oEmbed API
     *
     * This returns metadata such as:
     * - title
     * - thumbnail
     * - embed HTML
     */

    const spotifyResponse =
      await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(
          url
        )}`,
        {
          cache: "no-store",
        }
      );

    if (!spotifyResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Spotify oEmbed request failed",
        },
        {
          status:
            spotifyResponse.status,
        }
      );
    }

    const data =
      await spotifyResponse.json();

    return NextResponse.json({
      title: data.title || "",
      thumbnail:
        data.thumbnail_url || "",
    });
  } catch (error) {
    console.error(
      "Spotify API route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to retrieve Spotify track information",
      },
      {
        status: 500,
      }
    );
  }
}