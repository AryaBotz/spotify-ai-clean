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
// ENV DEBUG
// =====================
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "OK" : "MISSING");
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET ? "OK" : "MISSING");
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

// =====================
// SPOTIFY BASE
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
// 🔥 GLOBAL CALLBACK LOCK (FIX UTAMA)
// =====================
let processingCallback = false;
let lastCode = null;

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
// CALLBACK (ANTI DOUBLE EXECUTION)
// =====================
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  console.log("CALLBACK HIT:", req.query);

  if (!code) {
    return res.status(400).send("NO CODE RECEIVED");
  }

  // 🔥 BLOCK DUPLICATE CALLBACK
  if (processingCallback) {
    console.log("BLOCKED: still processing callback");
    return res.send("WAIT - processing");
  }

  if (lastCode === code) {
    console.log("BLOCKED: same code reused");
    return res.send("CODE ALREADY USED");
  }

  processingCallback = true;
  lastCode = code;

  try {
    console.log("EXCHANGING CODE...");

    const data = await spotifyBase.authorizationCodeGrant(code);

    accessToken = data.body.access_token;
    refreshToken = data.body.refresh_token;

    console.log("ACCESS TOKEN SAVED ✔");

    processingCallback = false;

    return res.send(`
      <h1>LOGIN SUCCESS ✔</h1>
      <p>You can close this page.</p>
    `);

  } catch (err) {
    processingCallback = false;

    console.log("AUTH ERROR:", err.message);

    return res.status(500).json({
      error: err.message,
      details: err.body || err
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
        error: "NOT_LOGGED_IN"
      });
    }

    const spotify = getSpotify();
    const me = await spotify.getMe();

    return res.json(me.body);

  } catch (err) {
    console.log("ME ERROR:", err);

    return res.status(500).json({
      error: err.message,
      details: err.body || err
    });
  }
});

// =====================
// CRASH PROTECTION (IMPORTANT FOR RAILWAY)
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
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
