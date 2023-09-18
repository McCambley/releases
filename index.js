// @ts-check
// Your Spotify API credentials
const CLIENT_ID = "dde73a7937494965912a433459ec1e60";
const CLIENT_SECRET = "";
const RELEASE_RADAR_PLAYLIST_ID = "37i9dQZEVXbvUwdkZRQfTG";
const USER_ID = "121426078";

// Get an access token using the Client Credentials Flow
async function getAccessToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
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

  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: trackUris,
    }),
  });

  const data = await response.json();

  //   console.log(
  // `Playlist "${playlistName}" created with ${trackUris.length} tracks.`
  //   );
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

(async () => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("No token found");
    }
    const tracks = await getReleaseRadarTracks(accessToken);
    const playlistsToCreate = [];
    const releaseRadarTrackUris = tracks.map((track) => track.uri);
    playlistsToCreate.push({
      name: "API Radar",
      trackUris: releaseRadarTrackUris,
    });

    for (const track of tracks) {
      const albumDetails = await getAlbumDetails(accessToken, track.album.id);

      if (albumDetails.total_tracks > 1) {
        const trackUris = albumDetails.tracks.items.map((item) => item.uri);
        const playlistName = `${formatDate(albumDetails.release_date)} - ${albumDetails.name} (${albumDetails.total_tracks})`;

        playlistsToCreate.push({ name: playlistName, trackUris });
      }
    }
    console.log(playlistsToCreate.map((p) => p.name));
    return;
    for (const playlist of playlistsToCreate) {
      await createPlaylist(accessToken, USER_ID, playlist.name, playlist.trackUris);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
