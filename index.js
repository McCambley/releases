// Your Spotify API credentials
const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';

// Get an access token using the Client Credentials Flow
async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

// Fetch tracks from the Release Radar playlist
async function getReleaseRadarTracks(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/playlists/RELEASE_RADAR_PLAYLIST_ID/tracks', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data.items.map(item => item.track);
}

// Fetch album details for a track
async function getAlbumDetails(accessToken, albumId) {
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data;
}

// Create a new playlist and add tracks to it
async function createPlaylist(accessToken, userId, playlistName, trackUris) {
  const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: playlistName,
      public: false,
    }),
  });

  const playlistData = await createPlaylistResponse.json();
  const playlistId = playlistData.id;

  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: trackUris,
    }),
  });

  console.log(`Playlist "${playlistName}" created with ${trackUris.length} tracks.`);
}

(async () => {
  try {
    const accessToken = await getAccessToken();
    const tracks = await getReleaseRadarTracks(accessToken);

    const userId = 'YOUR_USER_ID'; // Replace with your user ID
    const playlistsToCreate = [];

    for (const track of tracks) {
      const albumDetails = await getAlbumDetails(accessToken, track.album.id);

      if (albumDetails.total_tracks > 1) {
        const trackUris = albumDetails.tracks.items.map(item => item.uri);
        const playlistName = `${albumDetails.name} Playlist`;

        playlistsToCreate.push({ name: playlistName, trackUris });
      }
    }

    for (const playlist of playlistsToCreate) {
      await createPlaylist(accessToken, userId, playlist.name, playlist.trackUris);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
