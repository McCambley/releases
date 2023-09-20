# releases

Checks one's Release Radar for new releases and creates playlists for each one

Based on [this ChatGPT conversation](https://chat.openai.com/share/54abfd00-2c3a-4b0b-851b-15884cede879)

- [x] Figure out why API response doesn't match Playlist order
  - It just is...
- [x] Authenticate user
- [x] POST playlists

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
