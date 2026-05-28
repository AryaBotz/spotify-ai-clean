import express from "express";
import session from "express-session";
import SpotifyWebApi from "spotify-web-api-node";

const app = express();

// ================= SESSION (IN-MEMORY DULU) =================
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

// ================= SPOTIFY =================
function spotify() {
  return new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
  });
}

// ================= LOGIN =================
app.get("/login", (req, res) => {
  const s = spotify();

  const url = s.createAuthorizeURL([
    "user-read-private",
    "user-read-email"
  ]);

  res.redirect(url);
});

// ================= CALLBACK =================
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "NO_CODE" });
  }

  try {
    const s = spotify();

    const data = await s.authorizationCodeGrant(code);

    req.session.token = data.body.access_token;
    req.session.refresh = data.body.refresh_token;

    console.log("LOGIN SUCCESS ✔");

    res.redirect("/me");

  } catch (err) {
    console.log("AUTH ERROR:", err?.message);

    res.status(500).json({
      error: "AUTH_FAILED"
    });
  }
});

// ================= ME =================
app.get("/me", async (req, res) => {
  try {
    if (!req.session.token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }

    const s = spotify();
    s.setAccessToken(req.session.token);

    const me = await s.getMe();

    res.json(me.body);

  } catch (err) {
    res.status(500).json({
      error: "ME_FAILED"
    });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
