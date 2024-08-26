const jwt = require("jsonwebtoken"); // You might need to install this package
const chalk = require("chalk");

const redBold = chalk.bold.red;
const successBold = chalk.bold.green;
const yellowBold = chalk.bold.yellow;
const blueBold = chalk.bold.blue;
const cyanBold = chalk.bold.cyan;

const PLAYLIST_NAME = "Mega Release Radar";

// Number of days to look back for new releases
const DAYS = 6; // Friday
// const DAYS = 7; // Saturday
// const DAYS = 8; // Sunday
// const DAYS = 9; // Monday
// const DAYS = 10; // Tuesday

const TRACK_MINIMUM = 1;

// Your Spotify API credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const RELEASE_RADAR_PLAYLIST_ID = process.env.RELEASE_RADAR_PLAYLIST_ID;
const USER_ID = process.env.USER_ID;

// Get an access token using the Client Credentials Flow
async function getAccessToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();

  return data.access_token;
}

// Fetch tracks from the Release Radar playlist
async function getReleaseRadarTracks(accessToken) {
  // THIS IS UGLY
  let data = [];
  let firstData = {};
  let secondData = {};
  let thirdData = {};

  // Fetch first 100 tracks
  const first = await fetch(`https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=0&limit=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  firstData = await first.json();
  data = [...firstData.items.map((item) => item.track)];

  // Fetch next 100 tracks if any exist
  if (firstData.next) {
    const second = await fetch(`https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=100&limit=100&locale=US`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    secondData = await second.json();
    data = [...data, ...secondData.items.map((item) => item.track)];
  }

  // Fetch next 100 tracks if any exists
  if (secondData.next) {
    const third = await fetch(`https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=200&limit=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    thirdData = await third.json();
    data = [...data, ...thirdData.items.map((item) => item.track)];
  }

  return data;
}

// Fetch album details for a track
async function getAlbumDetails(accessToken, albumId) {
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data;
}

// Create a new playlist and add tracks to it
async function createPlaylist(accessToken, userId, playlistName, trackUris) {
  const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: playlistName,
      public: false,
    }),
  });

  const playlistData = await createPlaylistResponse.json();
  const playlistId = playlistData.id;
  // console.log("Created Playlist: ", playlistData.name);

  await delay(100);

  async function addSong(uri) {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [uri],
        }),
      });

      if (!response.ok) {
        // Handle error cases
        const errorData = await response.json();
        throw new Error(`Error adding songs: ${errorData.error.message}`);
      }
      console.log(blueBold("Added Song: ", uri));
      return response.json(); // Return the response data
    } catch (error) {
      console.error("An error occurred while adding songs:", error);

      throw error;
    }
  }

  let responses = [];
  for (const uri of trackUris) {
    const data = await addSong(uri);
    responses.push(data);
  }

  return responses;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function asyncPause() {
  await delay(2000); // Pause for 10 seconds asynchronously
}

function formatDate(inputDate) {
  // Parse the input date string
  const dateParts = inputDate.split("-");
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);

  // Format the date as MM/DD
  const formattedDate = `${month}/${day}`;

  return formattedDate;
}

function createAlbumName(albumDetails) {
  return `${formatDate(albumDetails.release_date)} | ${albumDetails.total_tracks} | ${albumDetails.artists[0].name} - ${albumDetails.name}`;
}

async function automatePlaylistCreation(accessToken) {
  try {
    if (!accessToken) {
      throw new Error("No token found");
    }
    const tracks = await getReleaseRadarTracks(accessToken);
    const playlistsToCreate = [];
    const releaseRadarTrackUris = tracks.map((track) => track.uri);
    let releaseRadarTrimmedTrackUris = [];

    // Get 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS);

    for (const track of tracks) {
      const albumDetails = await getAlbumDetails(accessToken, track.album.id);
      const releaseDate = new Date(albumDetails.release_date);
      const isRecent = releaseDate >= sevenDaysAgo;

      if (albumDetails.total_tracks > TRACK_MINIMUM && isRecent) {
        const trackUris = albumDetails.tracks.items.map((item) => item.uri);
        const playlistName = createAlbumName(albumDetails);
        // console.log("Making: ", playlistName);
        console.log(successBold(`Song "${track.name}" made it's own playlist: `, playlistName));
        playlistsToCreate.push({ name: playlistName, trackUris });
      }

      if (isRecent) {
        console.log(yellowBold(`Song made this weeks cut (${releaseDate}): `, track.name));
        releaseRadarTrimmedTrackUris.push(track.uri);
      } else {
        console.log(redBold(`Song didn't make this weeks cut (${releaseDate}): `, track.name));
      }
    }

    playlistsToCreate.sort();
    playlistsToCreate.push({
      name: "API Radar (Trimmed)",
      trackUris: releaseRadarTrimmedTrackUris,
    });

    playlistsToCreate.push({
      name: "API Radar",
      trackUris: releaseRadarTrackUris,
    });

    // console.log(playlistsToCreate);

    for (const playlist of playlistsToCreate) {
      await createPlaylist(accessToken, USER_ID, playlist.name, playlist.trackUris);
      console.log(successBold(`${playlist.name} created!`));
    }
    console.log(cyanBold("Success!!"));
    return { status: 200, message: "Success!", data: playlistsToCreate };
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
}

async function fetchFollowedArtists(accessToken) {
  let followedArtists = [];
  let fetchMore = true;

  async function fetchFollowedArtistsInner(url) {
    const response = await fetch(url || `https://api.spotify.com/v1/me/following?type=artist&limit=50`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    console.log("data", data);
    followedArtists = [...followedArtists, ...data.artists.items];
    if (data.artists.next) {
      await fetchFollowedArtistsInner(data.artists.next);
    } else {
      fetchMore = false;
    }
  }

  do {
    try {
      await fetchFollowedArtistsInner();
    } catch (error) {
      console.log(error);
      fetchMore = false;
    }
    await delay(50);
  } while (fetchMore);

  return followedArtists;
}
async function fetchRecentArtistReleases(accessToken, id) {
  let artistReleases = [];
  let fetchMore = true;

  async function fetchRecentArtistReleasesInner(accessToken, id, url) {
    const response = await fetch(url || `https://api.spotify.com/v1/artists/${id}/albums`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // console.log(response);
    if (!response.ok) {
      console.log("response", response);
      throw new Error(response.statusText);
    }
    const data = await response.json();
    // console.log("data", data);
    artistReleases = [...artistReleases, ...data.items];
    if (data.next) {
      await fetchRecentArtistReleasesInner(accessToken, id, data.next);
    } else {
      fetchMore = false;
    }
  }

  do {
    try {
      await fetchRecentArtistReleasesInner(accessToken, id);
    } catch (error) {
      console.log(error);
      fetchMore = false;
    }
    await delay(100);
  } while (fetchMore);

  // Get 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS);

  const recentReleases = artistReleases.filter((release) => new Date(release.release_date) >= sevenDaysAgo);

  return recentReleases;
}

async function getNewMusic(accessToken) {
  /**
   * @type {Object.<string, string[]>}
   */
  const megaReleaseRadar = {
    PLAYLIST_NAME: [],
  };
  // Get followed artists
  let followedArtists = await fetchFollowedArtists(accessToken);

  // Iterate over artists
  let allRecentReleases = [];
  for (const artist of followedArtists) {
    const artistReleases = await fetchRecentArtistReleases(accessToken, artist.id);
    // console.log(`${artist.name} has ${artistReleases.length} releases`);
    // console.log(artistReleases.map((release) => release.release_date));
    allRecentReleases = [...allRecentReleases, ...artistReleases];
    await delay(100);
  }

  for (const recentRelease of allRecentReleases) {
    // Get album details
    const releaseDetails = await getAlbumDetails(accessToken, recentRelease.id);
    const uris = releaseDetails.tracks.items.map((i) => i.uri);
    // Check if the album has fewer than 4 tracks
    if (releaseDetails.tracks.total < 4) {
      // Add all tracks to the Mega Release Radar
      megaReleaseRadar[PLAYLIST_NAME] = [...megaReleaseRadar[PLAYLIST_NAME], ...uris];
    } else {
      const albumName = createAlbumName(releaseDetails);
      megaReleaseRadar[albumName] = uris;
    }
    await delay(100);
  }

  // Create playlist for each album
  for (const [playlistName, trackUris] of Object.entries(megaReleaseRadar)) {
    await createPlaylist(accessToken, USER_ID, playlistName, trackUris);
    console.log(successBold(`${playlistName} created!`));
    await delay(100);
  }

  return megaReleaseRadar;
}

module.exports = { automatePlaylistCreation, fetchFollowedArtists, fetchArtistReleases: fetchRecentArtistReleases, getNewMusic };
