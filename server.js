const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("SPOTIFY AI BACKEND OK ✔");
});

// =====================
// DEBUG ENV (WAJIB)
// =====================
console.log("ENV CHECK:");
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "OK" : "MISSING");
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET ? "OK" : "MISSING");
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

// =====================
// SPOTIFY INIT
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

  const authorizeURL = spotify.createAuthorizeURL(scopes, null, true);

  console.log("LOGIN URL GENERATED");
  res.redirect(authorizeURL);
});

// =====================
// CALLBACK ROUTE (FIXED)
// =====================
app.get("/callback", async (req, res) => {
  console.log("CALLBACK HIT:", req.query);

  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.status(400).send("Spotify Error: " + error);
  }

  if (!code) {
    return res.status(400).send("NO CODE RECEIVED");
  }

  try {
    console.log("EXCHANGING CODE...");

    const data = await spotify.authorizationCodeGrant(code);

    const access_token = data.body.access_token;
    const refresh_token = data.body.refresh_token;

    spotify.setAccessToken(access_token);
    spotify.setRefreshToken(refresh_token);

    console.log("LOGIN SUCCESS ✔");

    return res.send(`
      <h1>LOGIN SUCCESS ✔</h1>
      <p>Spotify OAuth berhasil.</p>
      <p>Kamu sudah bisa tutup halaman ini.</p>
    `);

  } catch (err) {
    console.log("AUTH ERROR:", err.message);

    return res.status(500).send(`
      <h1>AUTH FAILED</h1>
      <pre>${err.message}</pre>
    `);
  }
});

// =====================
// GET USER PROFILE (NEXT STEP AI ENGINE)
// =====================
app.get("/me", async (req, res) => {
  try {
    const me = await spotify.getMe();
    res.json(me.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// START SERVER (RAILWAY SAFE)
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
