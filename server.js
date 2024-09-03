// ts-check
const express = require("express");
const querystring = require("querystring");

require("dotenv").config();

const { automatePlaylistCreation, fetchFollowedArtists, getNewMusic, getSavedSongs } = require("./index");

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const scopes = ["playlist-modify-public", "playlist-modify-private", "user-follow-read", "user-library-read"];

async function getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken) {
  const data = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify(data),
  });

  const tokenData = await response.json();
  if (tokenData.access_token) {
    return tokenData.access_token;
  } else {
    throw new Error("Failed to obtain access token.");
  }
}

app.get("/login", (req, res) => {
  const authorizeUrl =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: CLIENT_ID,
      scope: scopes.join(" "),
      redirect_uri: REDIRECT_URI,
    });
  res.redirect(authorizeUrl);
});

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;

    const tokenData = await getAccessToken(code);
    const refreshToken = tokenData.refresh_token;
    const accessToken = await getAccessTokenFromRefreshToken(CLIENT_ID, CLIENT_SECRET, refreshToken);
    const responseV2 = await getNewMusic(accessToken);
    // OLD
    const response = await automatePlaylistCreation(accessToken);

    // Store the refresh token securely for future use.
    // This refresh token can be used to obtain access tokens without the need for user interaction.

    res.send({ response, responseV2 });
  } catch (error) {
    console.error(error);
    // res.redirect("/login");
    res.status(500).send("An error occurred.");
  }
});

async function getAccessToken(code) {
  const data = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
  };

  const authHeader = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify(data),
  });

  const tokenData = await response.json();
  return tokenData;
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
