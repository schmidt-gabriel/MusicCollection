package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	db "music-go-api/database"
	"music-go-api/models"
)

// These handlers keep the Spotify and Discogs credentials on the server. The
// browser talks only to these authenticated endpoints (see the frontend
// services/Spotify.tsx, Discogs.tsx and Lyrics.tsx); no third-party secret is
// ever shipped to the client. Credentials come from environment variables:
// SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, DISCOGS_TOKEN. Lyrics come from
// LRCLIB, which needs no key.

const (
	discogsAPI   = "https://api.discogs.com"
	discogsUA    = "MusicCollection/1.0"
	spotifyToken = "https://accounts.spotify.com/api/token"
	spotifyAPI   = "https://api.spotify.com/v1"
	lrclibAPI    = "https://lrclib.net"
	// LRCLIB asks clients to identify themselves.
	lrclibUA = "MusicCollection/1.0 (https://github.com/gabriel/music-collection)"
)

var httpClient = &http.Client{Timeout: 15 * time.Second}

// ---------- Spotify ----------

var (
	spotifyMu      sync.Mutex
	spotifyCurrent string
	spotifyExpires time.Time
)

// spotifyAccessToken returns a cached app token (client_credentials flow),
// refreshing it a minute before expiry.
func spotifyAccessToken(force bool) (string, error) {
	spotifyMu.Lock()
	defer spotifyMu.Unlock()

	if !force && spotifyCurrent != "" && time.Now().Before(spotifyExpires) {
		return spotifyCurrent, nil
	}

	id := os.Getenv("SPOTIFY_CLIENT_ID")
	secret := os.Getenv("SPOTIFY_CLIENT_SECRET")
	if id == "" || secret == "" {
		return "", fmt.Errorf("spotify credentials are not configured")
	}

	form := url.Values{"grant_type": {"client_credentials"}}
	req, err := http.NewRequest(http.MethodPost, spotifyToken, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(id, secret)
	req.Header.Set(contentType, "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("spotify token request failed: %d", resp.StatusCode)
	}

	var tok struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil {
		return "", err
	}
	spotifyCurrent = tok.AccessToken
	spotifyExpires = time.Now().Add(time.Duration(tok.ExpiresIn-60) * time.Second)
	return spotifyCurrent, nil
}

// spotifySearch mirrors the old browser call: it returns the first album item
// (or null) for an artist/album query.
func spotifySearch(w http.ResponseWriter, r *http.Request) {
	artist := r.URL.Query().Get("artist")
	album := r.URL.Query().Get("album")

	params := url.Values{
		"q":    {fmt.Sprintf("artist:%s album:%s", artist, album)},
		"type": {"album"},
	}
	reqURL := spotifyAPI + "/search?" + params.Encode()

	resp, err := spotifyGet(reqURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	var data struct {
		Albums struct {
			Items []json.RawMessage `json:"items"`
		} `json:"albums"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set(contentType, "application/json; charset=UTF-8")
	if len(data.Albums.Items) == 0 {
		w.Write([]byte("null"))
		return
	}
	w.Write(data.Albums.Items[0])
}

// spotifyGet performs an authenticated GET and refreshes the token once on 401.
func spotifyGet(reqURL string) (*http.Response, error) {
	token, err := spotifyAccessToken(false)
	if err != nil {
		return nil, err
	}
	do := func(tok string) (*http.Response, error) {
		req, err := http.NewRequest(http.MethodGet, reqURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+tok)
		return httpClient.Do(req)
	}
	resp, err := do(token)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode == http.StatusUnauthorized {
		resp.Body.Close()
		if token, err = spotifyAccessToken(true); err != nil {
			return nil, err
		}
		return do(token)
	}
	return resp, nil
}

// ---------- Discogs ----------

var (
	discogsIDRe   = regexp.MustCompile(`^[0-9]+$`)
	discogsTypeRe = regexp.MustCompile(`^[a-z]+$`)
	objectIDRe    = regexp.MustCompile(`^[a-f0-9]{24}$`)
)

// isInsertedID reports whether an /new/album response is a real Mongo id (as
// opposed to "Album already exists" or an error string).
func isInsertedID(s string) bool { return objectIDRe.MatchString(s) }

func discogsToken() string { return os.Getenv("DISCOGS_TOKEN") }

// proxyDiscogs forwards to the given Discogs URL with the required User-Agent
// and streams the response back verbatim.
func proxyDiscogs(w http.ResponseWriter, upstream string) {
	req, err := http.NewRequest(http.MethodGet, upstream, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", discogsUA)

	resp, err := httpClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set(contentType, "application/json; charset=UTF-8")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func withDiscogsToken(params url.Values) url.Values {
	if t := discogsToken(); t != "" {
		params.Set("token", t)
	}
	return params
}

// discogsSearch proxies /database/search, injecting the token server-side.
func discogsSearch(w http.ResponseWriter, r *http.Request) {
	params := url.Values{}
	for _, k := range []string{"artist", "release_title", "barcode"} {
		if v := r.URL.Query().Get(k); v != "" {
			params.Set(k, v)
		}
	}
	proxyDiscogs(w, discogsAPI+"/database/search?"+withDiscogsToken(params).Encode())
}

// discogsRelease proxies /releases/{id}.
func discogsRelease(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if !discogsIDRe.MatchString(id) {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	proxyDiscogs(w, fmt.Sprintf("%s/releases/%s?%s", discogsAPI, id, withDiscogsToken(url.Values{}).Encode()))
}

// discogsTracks proxies /{type}s/{id} (used to fetch a release/master tracklist).
func discogsTracks(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	typ := r.URL.Query().Get("type")
	if !discogsIDRe.MatchString(id) || !discogsTypeRe.MatchString(typ) {
		http.Error(w, "invalid type or id", http.StatusBadRequest)
		return
	}
	proxyDiscogs(w, fmt.Sprintf("%s/%ss/%s?%s", discogsAPI, typ, id, withDiscogsToken(url.Values{}).Encode()))
}

// ---------- Lyrics (Mongo cache + LRCLIB) ----------

// lyricsKey normalizes artist/title/album into a stable cache key.
func lyricsKey(artist, title, album string) string {
	norm := func(s string) string { return strings.ToUpper(strings.TrimSpace(s)) }
	return norm(artist) + "|" + norm(title) + "|" + norm(album)
}

func writeLyrics(w http.ResponseWriter, plain, synced string, instrumental bool) {
	w.Header().Set(contentType, "application/json; charset=UTF-8")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"plainLyrics":  plain,
		"syncedLyrics": synced,
		"instrumental": instrumental,
	})
}

// fetchLyricsFromLRCLIB queries LRCLIB and returns the best match's plain and
// synced lyrics, plus whether the track is flagged instrumental. All zero when
// nothing is found.
func fetchLyricsFromLRCLIB(artist, title, album string) (plain string, synced string, instrumental bool) {
	params := url.Values{"track_name": {title}}
	if artist != "" {
		params.Set("artist_name", artist)
	}
	if album != "" {
		params.Set("album_name", album)
	}

	req, err := http.NewRequest(http.MethodGet, lrclibAPI+"/api/search?"+params.Encode(), nil)
	if err != nil {
		return "", "", false
	}
	req.Header.Set("User-Agent", lrclibUA)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", false
	}
	defer resp.Body.Close()

	var results []struct {
		PlainLyrics  string `json:"plainLyrics"`
		SyncedLyrics string `json:"syncedLyrics"`
		Instrumental bool   `json:"instrumental"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return "", "", false
	}
	// Prefer a result that actually has lyrics.
	for _, res := range results {
		if res.PlainLyrics != "" || res.SyncedLyrics != "" {
			return res.PlainLyrics, res.SyncedLyrics, false
		}
	}
	// No lyrics: if the best match is flagged instrumental, record that.
	if len(results) > 0 && results[0].Instrumental {
		return "", "", true
	}
	return "", "", false
}

// ensureLyricsCached fetches lyrics for a track when not already attempted and
// records the attempt (found, instrumental, or miss). Used by the background jobs.
func ensureLyricsCached(artist, title, album string) {
	key := lyricsKey(artist, title, album)
	if cached, _, _, _ := db.GetCachedLyrics(key); cached {
		return
	}
	plain, synced, instrumental := fetchLyricsFromLRCLIB(artist, title, album)
	db.SaveLyrics(key, artist, title, album, plain, synced, instrumental)
}

// prefetchAlbumLyrics warms the lyrics cache for every track of a freshly added
// album. Run in a goroutine (fire-and-forget); requests are sequential and
// spaced out to stay polite to LRCLIB.
func prefetchAlbumLyrics(album models.Collection) {
	defer func() { _ = recover() }()
	seen := map[string]bool{}
	for _, t := range album.Discogs.Tracks {
		title := strings.TrimSpace(t.Title)
		if title == "" || seen[strings.ToUpper(title)] {
			continue
		}
		seen[strings.ToUpper(title)] = true
		ensureLyricsCached(album.Artist, title, album.Title)
		time.Sleep(300 * time.Millisecond)
	}
}

// lyricsSearch returns lyrics for a track. It first checks the Mongo LYRICS
// cache; on a miss (or when refresh=1 forces it) it queries LRCLIB (keyless,
// community-sourced), recording the attempt so the next lookup hits Mongo.
func lyricsSearch(w http.ResponseWriter, r *http.Request) {
	title := r.URL.Query().Get("title")
	if title == "" {
		http.Error(w, "missing title", http.StatusBadRequest)
		return
	}
	artist := r.URL.Query().Get("artist")
	album := r.URL.Query().Get("album")
	key := lyricsKey(artist, title, album)

	// 1. Mongo cache, unless the client forces a fresh lookup.
	if r.URL.Query().Get("refresh") != "1" {
		if cached, plain, synced, instrumental := db.GetCachedLyrics(key); cached {
			writeLyrics(w, plain, synced, instrumental)
			return
		}
	}

	// 2. LRCLIB API, recording the attempt (found, instrumental, or miss).
	plain, synced, instrumental := fetchLyricsFromLRCLIB(artist, title, album)
	db.SaveLyrics(key, artist, title, album, plain, synced, instrumental)
	writeLyrics(w, plain, synced, instrumental)
}

// lyricsInstrumental marks a track as instrumental (POST body: artist, title,
// album), so it no longer shows as "not found" and is not fetched again.
func lyricsInstrumental(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Artist string `json:"artist"`
		Title  string `json:"title"`
		Album  string `json:"album"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Title) == "" {
		http.Error(w, "missing title", http.StatusBadRequest)
		return
	}
	key := lyricsKey(body.Artist, body.Title, body.Album)
	db.SaveLyrics(key, body.Artist, body.Title, body.Album, "", "", true)
	w.Header().Set(contentType, "application/json; charset=UTF-8")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// ---------- Background lyrics sweep ----------

const (
	lyricsSweepInterval = time.Hour
	lyricsSweepBatch    = 10 // tracks per run, kept small to be gentle on LRCLIB
)

// runLyricsSweep warms the cache for a small batch of tracks that have no LYRICS
// entry yet. It returns done=true only when the query succeeded and found
// nothing left. On a query error it logs and returns false so the sweep keeps
// retrying instead of stopping. Misses/instrumentals are recorded, so it
// converges.
func runLyricsSweep(limit int) (done bool) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("lyrics sweep: recovered from panic: %v", r)
		}
	}()

	missing, err := db.FindTracksMissingLyrics(limit)
	if err != nil {
		log.Printf("lyrics sweep: query failed, will retry: %v", err)
		return false
	}
	if len(missing) == 0 {
		return true
	}
	log.Printf("lyrics sweep: warming %d track(s)", len(missing))
	for _, m := range missing {
		artist, _ := m["artist"].(string)
		album, _ := m["album"].(string)
		track, _ := m["track"].(string)
		if strings.TrimSpace(track) == "" {
			continue
		}
		ensureLyricsCached(artist, track, album)
		time.Sleep(500 * time.Millisecond)
	}
	if total, err := db.CountLyrics(); err == nil {
		log.Printf("lyrics sweep: batch done, LYRICS now has %d doc(s)", total)
	}
	return false
}

// startLyricsSweeper runs the sweep shortly after boot and then every interval,
// stopping itself once every track has been attempted (new albums are handled
// on insert by prefetchAlbumLyrics). Call once as a goroutine from main.
func startLyricsSweeper() {
	if n, err := db.CountAlbumsWithTracks(); err != nil {
		log.Printf("lyrics sweep: scheduled (album-track count failed: %v)", err)
	} else {
		log.Printf("lyrics sweep: scheduled; %d album(s) have tracks", n)
	}
	time.Sleep(time.Minute)
	for {
		if runLyricsSweep(lyricsSweepBatch) {
			log.Println("lyrics sweep: nothing left to fetch, stopping")
			return
		}
		time.Sleep(lyricsSweepInterval)
	}
}
