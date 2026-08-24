"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SpotifyCallback() {
  const router = useRouter();

  const [status, setStatus] = useState(
    "Connecting to Spotify..."
  );

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    hasRun.current = true;

    const connectSpotify = async () => {
      const params = new URLSearchParams(
        window.location.search
      );

      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setStatus(`Spotify login failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus(
          "No Spotify authorization code found."
        );
        return;
      }

      // IMPORTANT:
      // Use localStorage so the verifier survives
      // localhost / 127.0.0.1 navigation.
      const verifier = localStorage.getItem(
        "spotify_code_verifier"
      );

      if (!verifier) {
        console.error(
          "Spotify PKCE verifier missing."
        );

        setStatus(
          "Spotify PKCE verifier is missing. Please login again."
        );

        return;
      }

      const processedCode =
        localStorage.getItem(
          "spotify_processed_code"
        );

      if (processedCode === code) {
        setStatus(
          "Spotify login is already being processed..."
        );
        return;
      }

      localStorage.setItem(
        "spotify_processed_code",
        code
      );

      try {
        const clientId =
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

        const redirectUri =
          process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

        if (!clientId || !redirectUri) {
          setStatus(
            "Spotify configuration is missing."
          );
          return;
        }

        const response = await fetch(
          "https://accounts.spotify.com/api/token",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },

            body: new URLSearchParams({
              client_id: clientId,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
              code_verifier: verifier,
            }),
          }
        );

        const data = await response.json();

        console.log(
          "Spotify token response:",
          response.status,
          data
        );

        if (!response.ok) {
          console.error(
            "Spotify token error:",
            data
          );

          localStorage.removeItem(
            "spotify_processed_code"
          );

          setStatus(
            `Spotify connection failed: ${
              data.error_description ||
              data.error ||
              "Unknown error"
            }`
          );

          return;
        }

        if (!data.access_token) {
          setStatus(
            "Spotify did not return an access token."
          );
          return;
        }

        localStorage.setItem(
          "spotify_access_token",
          data.access_token
        );

        if (data.refresh_token) {
          localStorage.setItem(
            "spotify_refresh_token",
            data.refresh_token
          );
        }

        localStorage.removeItem(
          "spotify_code_verifier"
        );

        setStatus(
          "Spotify Connected ✓"
        );

        setTimeout(() => {
          router.replace("/");
        }, 1000);

      } catch (error) {
        console.error(
          "Spotify connection error:",
          error
        );

        localStorage.removeItem(
          "spotify_processed_code"
        );

        setStatus(
          "Something went wrong while connecting Spotify."
        );
      }
    };

    connectSpotify();

  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="mb-3 text-2xl font-bold">
          Chai Tapri ☕
        </h1>

        <p className="text-white/70">
          {status}
        </p>
      </div>
    </main>
  );
}