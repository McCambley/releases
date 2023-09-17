// Your Spotify API credentials
const clientId = "";
const clientSecret = "";
const RELEASE_RADAR_PLAYLIST_ID = "37i9dQZEVXbvUwdkZRQfTG";

// Get an access token using the Client Credentials Flow
async function getAccessToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
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
  const first = await fetch(
    `https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=0&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const firstData = await first.json();
  data = [...firstData.items.map((item) => item.track)];
  if (firstData.next) {
    const second = await fetch(
      `https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=100&limit=100&locale=US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const secondData = await second.json();
    data = [...data, ...secondData.items.map((item) => item.track)];
    if (secondData.next) {
      const third = await fetch(
        `https://api.spotify.com/v1/playlists/${RELEASE_RADAR_PLAYLIST_ID}/tracks?offset=200&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const thirdData = await third.json();
      data = [...data, ...thirdData.items.map((item) => item.track)];
    }
  }

  console.log(data);
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
  const createPlaylistResponse = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName,
        public: false,
      }),
    }
  );

  const playlistData = await createPlaylistResponse.json();
  console.log(playlistData);
  const playlistId = playlistData.id;

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    }
  );

  const data = await response.json();
  console.log("PLAYLIST CREATED");
  console.log(data);

  //   console.log(
  // `Playlist "${playlistName}" created with ${trackUris.length} tracks.`
  //   );
}

(async () => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("No token found");
    }
    const tracks = await getReleaseRadarTracks(accessToken);
    // console.log({ tracks: tracks.length });
    // return;
    const userId = "121426078"; // Replace with your user ID
    const playlistsToCreate = [];

    for (const track of tracks) {
      const albumDetails = await getAlbumDetails(accessToken, track.album.id);

      if (albumDetails.total_tracks > 10) {
        const trackUris = albumDetails.tracks.items.map((item) => item.uri);
        const playlistName = `${albumDetails.name} Playlist`;

        playlistsToCreate.push({ name: playlistName, trackUris });
      }
    }

    for (const playlist of playlistsToCreate) {
      await createPlaylist(
        accessToken,
        userId,
        playlist.name,
        playlist.trackUris
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
