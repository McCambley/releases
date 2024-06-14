# releases

Checks one's Release Radar for new releases and creates playlists for each one

# Overview

- Create a playlist containing all songs on your "Release Radar" released in only the past `6` days
- Create a playlist for each album or EP released in the past `6` days that contains a song featured on your released radar

## Notes:

- Album and EP playlist are titled as `date` | `# of tracks` | `artist` - `album title`
- A playlist called "API Radar" is also created, as once or twice my Release Radar and the API response after a `GET` request to fetch that playlists contained songs not seen in Spotify 
- The `6` day limit is easily adjustable from within `index.js`

# Getting Started

- Clone this repository
- Create an App in the Spotify Developers Portal
- Update the `.env` file accordingly

```
CLIENT_ID="SPOTIFY_CLIENT_ID"
CLIENT_SECRET="SPOTIFY_CLIENT_SECRET"
RELEASE_RADAR_PLAYLIST_ID="SPOTIFY_RELEASE_RADAR_PLAYLIST_ID"
USER_ID="SPOTIFY_USER_ID"
REDIRECT_URI="CALLBACK_URL"
# Ex. REDIRECT_URI="http://localhost:3000/callback"
```

- Run `npm run dev`
- Navigate to `http://localhost:3000/login`
