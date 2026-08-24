"use client";

import { useState } from "react";

function generateRandomString(length: number) {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  let text = "";

  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  for (let i = 0; i < length; i++) {
    text += possible[values[i] % possible.length];
  }

  return text;
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function SpotifyLogin() {
  const [loading, setLoading] = useState(false);

  const loginWithSpotify = async () => {
    try {
      setLoading(true);

      const clientId =
        process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

      const redirectUri =
        process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        console.error("Spotify environment variables are missing.");
        alert("Spotify configuration is missing.");
        setLoading(false);
        return;
      }

      // Clear old Spotify data
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_refresh_token");
      localStorage.removeItem("spotify_processed_code");

      const codeVerifier = generateRandomString(128);

      // IMPORTANT: localStorage instead of sessionStorage
      localStorage.setItem(
        "spotify_code_verifier",
        codeVerifier
      );

      const codeChallenge =
        await generateCodeChallenge(codeVerifier);

      const scopes = [
        "streaming",
        "user-read-email",
        "user-read-private",
        "user-read-playback-state",
        "user-modify-playback-state",
      ].join(" ");

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        scope: scopes,
        show_dialog: "true",
      });

      window.location.href =
        `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (error) {
      console.error("Spotify login error:", error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={loginWithSpotify}
      disabled={loading}
      className="rounded-full bg-green-500 px-6 py-3 font-semibold text-black shadow-lg transition hover:scale-105 hover:bg-green-400 disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Login with Spotify"}
    </button>
  );
}