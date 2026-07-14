package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// These handlers keep the Spotify and Discogs credentials on the server. The
// browser talks only to these authenticated endpoints (see the frontend
// services/Spotify.tsx and services/Discogs.tsx); no third-party secret is ever
// shipped to the client. Credentials come from environment variables:
// SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, DISCOGS_TOKEN.

const (
	discogsAPI   = "https://api.discogs.com"
	discogsUA    = "MusicCollection/1.0"
	spotifyToken = "https://accounts.spotify.com/api/token"
	spotifyAPI   = "https://api.spotify.com/v1"
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
)

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
