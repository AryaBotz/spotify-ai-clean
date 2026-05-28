const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();

// =====================
// BASIC HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("SPOTIFY AI BACKEND OK ✔");
});

// =====================
// SPOTIFY CONFIG
// =====================
const spotify = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// =====================
// LOGIN ROUTE
// =====================
app.get("/login", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played"
  ];

  const url = spotify.createAuthorizeURL(scopes);
  res.redirect(url);
});

// =====================
// CALLBACK (ANTI LOOP FIXED)
// =====================
app.get("/callback", async (req, res) => {
  console.log("CALLBACK HIT:", req.query);

  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.status(400).send("Spotify Error: " + error);
  }

  if (!code) {
    return res.status(400).send("No code received");
  }

  try {
    const data = await spotify.authorizationCodeGrant(code);

    const access_token = data.body.access_token;
    const refresh_token = data.body.refresh_token;

    spotify.setAccessToken(access_token);
    spotify.setRefreshToken(refresh_token);

    console.log("ACCESS TOKEN OK");
    console.log("REFRESH TOKEN OK");

    // IMPORTANT: STOP FLOW HERE (NO REDIRECT)
    return res.send(`
      <h1>LOGIN SUCCESS ✔</h1>
      <p>Spotify OAuth berhasil.</p>
      <p>You can close this page.</p>
    `);

  } catch (err) {
    console.log("AUTH ERROR:", err);

    return res.status(500).send(`
      <h1>AUTH FAILED</h1>
      <pre>${err.message}</pre>
    `);
  }
});

// =====================
// START SERVER (RAILWAY FIX)
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
