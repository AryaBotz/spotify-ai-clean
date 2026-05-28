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
// ENV CHECK
// =====================
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "OK" : "MISSING");
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET ? "OK" : "MISSING");
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

// =====================
// SPOTIFY BASE INSTANCE
// =====================
const spotifyBase = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// =====================
// TOKEN STORAGE
// =====================
let accessToken = null;
let refreshToken = null;

// =====================
// LOGIN
// =====================
app.get("/login", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played"
  ];

  const url = spotifyBase.createAuthorizeURL(scopes, null, true);
  res.redirect(url);
});

// =====================
// CALLBACK (SAFE + ANTI ERROR)
// =====================
app.get("/callback", async (req, res) => {
  console.log("CALLBACK HIT:", req.query);

  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      error: "NO_CODE_RECEIVED",
      query: req.query
    });
  }

  try {
    const data = await spotifyBase.authorizationCodeGrant(code);

    accessToken = data.body.access_token;
    refreshToken = data.body.refresh_token;

    console.log("ACCESS TOKEN SAVED ✔");

    return res.send(`
      <h1>LOGIN SUCCESS ✔</h1>
      <p>You can close this page</p>
    `);

  } catch (err) {
    console.log("AUTH ERROR RAW:", err);

    return res.status(500).json({
      error: err?.message || "AUTH_FAILED",
      statusCode: err?.statusCode || null,
      spotifyError: err?.body || null,
      raw: safeStringify(err)
    });
  }
});

// =====================
// SAFE SPOTIFY INSTANCE
// =====================
function getSpotify() {
  return new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    accessToken,
    refreshToken
  });
}

// =====================
// /ME FIXED
// =====================
app.get("/me", async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        error: "NOT_AUTHENTICATED"
      });
    }

    const spotify = getSpotify();
    const me = await spotify.getMe();

    return res.json(me.body);

  } catch (err) {
    console.log("ME ERROR RAW:", err);

    return res.status(500).json({
      error: err?.message || "ME_FAILED",
      statusCode: err?.statusCode || null,
      spotifyError: err?.body || null,
      raw: safeStringify(err)
    });
  }
});

// =====================
// SAFE ERROR STRINGIFY (FIX [object Object])
// =====================
function safeStringify(obj) {
  try {
    return JSON.parse(JSON.stringify(obj, Object.getOwnPropertyNames(obj)));
  } catch {
    return String(obj);
  }
}

// =====================
// CRASH HANDLER (RAILWAY SAFE)
// =====================
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED:", err);
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
