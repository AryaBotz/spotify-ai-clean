const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();

// =====================
// BASIC CHECK
// =====================
app.get("/", (req, res) => {
  res.send("SPOTIFY AI BACKEND OK ✔");
});

// =====================
// DEBUG ENV
// =====================
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
// TEMP TOKEN STORAGE (IMPORTANT FIX)
// =====================
let accessToken = null;
let refreshToken = null;

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

  const url = spotify.createAuthorizeURL(scopes, null, true);

  res.redirect(url);
});

// =====================
// CALLBACK (FIXED)
// =====================
app.get("/callback", async (req, res) => {
  console.log("CALLBACK HIT:", req.query);

  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.status(400).json({ error });
  }

  if (!code) {
    return res.status(400).send("NO CODE RECEIVED");
  }

  try {
    const data = await spotify.authorizationCodeGrant(code);

    accessToken = data.body.access_token;
    refreshToken = data.body.refresh_token;

    spotify.setAccessToken(accessToken);
    spotify.setRefreshToken(refreshToken);

    console.log("LOGIN SUCCESS ✔");

    return res.send(`
      <h1>LOGIN SUCCESS ✔</h1>
      <p>Spotify OAuth OK</p>
    `);

  } catch (err) {
    console.log("AUTH ERROR:", err.message);

    return res.status(500).json({
      error: err.message,
      details: err.body || err
    });
  }
});

// =====================
// FORCE TOKEN CHECK MIDDLEWARE
// =====================
function ensureAuth(req, res, next) {
  if (!accessToken) {
    return res.status(401).json({
      error: "NOT_AUTHENTICATED",
      message: "Login dulu via /login"
    });
  }

  spotify.setAccessToken(accessToken);
  spotify.setRefreshToken(refreshToken);

  next();
}

// =====================
// /ME FIXED (NO OBJECT ERROR)
// =====================
app.get("/me", ensureAuth, async (req, res) => {
  try {
    const me = await spotify.getMe();
    res.json(me.body);
  } catch (err) {
    console.log("ME ERROR:", err);

    res.status(500).json({
      error: err.message,
      details: err.body || err
    });
  }
});

// =====================
// START SERVER (RAILWAY SAFE)
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
