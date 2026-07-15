package database

import (
	"context"
	"errors"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	models "music-go-api/models"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var coll *mongo.Collection
var lyricsColl *mongo.Collection

const (
	CollectionName       = "CD"
	LyricsCollectionName = "LYRICS"
	Group                = "$group"
)

func init() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Fatalln("Error loading .env")
	}
	GetColl()
}

func convertDate(value interface{}) (time.Time, error) {
	// Convert string Purchase to date field
	if value == nil || value.(string) == "" {
		return time.Now(), errors.New("purchase is empty")
	}

	// check string formar if contains parsing time "2024-01-08T00:00:00Z": extra text: "T00:00:00Z"
	if strings.Contains(value.(string), "T") {
		date, error := time.Parse("2006-01-02T00:00:00Z", value.(string))

		if error != nil {
			return time.Now(), error
		}

		return date, nil

	} else if strings.Contains(value.(string), "Z") {
		date, error := time.Parse("2006-01-02Z", value.(string))

		if error != nil {
			return time.Now(), error
		}

		return date, nil
	}
	date, error := time.Parse("2006-01-02", value.(string))

	if error != nil {
		return time.Now(), error
	}

	return date, nil
}

func CloseConn() {
	coll.Database().Client().Disconnect(context.Background())
}

func GetColl() *mongo.Collection {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		log.Fatal("You must set your 'MONGODB_URI' environment variable.")
	}

	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}

	err = client.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatal(err)
	}
	database := os.Getenv("MONGODB_DATABASE")
	if database == "" {
		log.Fatal("You must set your 'MONGODB_DATABASE' environment variable.")
	}

	coll = client.Database(database).Collection(CollectionName)
	lyricsColl = client.Database(database).Collection(LyricsCollectionName)

	log.Printf("Connected to MongoDB! Collection %s", coll.Name())
	return coll
}

// GetCachedLyrics returns the cached lyrics for a normalized key, if present.
func GetCachedLyrics(key string) (cached bool, plain string, synced string, instrumental bool) {
	var doc struct {
		Plain        string `bson:"PLAIN"`
		Synced       string `bson:"SYNCED"`
		Instrumental bool   `bson:"INSTRUMENTAL"`
	}
	if err := lyricsColl.FindOne(context.TODO(), bson.M{"_id": key}).Decode(&doc); err != nil {
		return false, "", "", false
	}
	return true, doc.Plain, doc.Synced, doc.Instrumental
}

// SaveLyrics upserts a lyrics attempt into the cache collection keyed by the
// normalized key. It stores the doc even when nothing was found (FOUND=false),
// so a track is not looked up again and the background sweep converges. Pass
// instrumental=true to record a track with no lyrics (from the LRCLIB flag or a
// manual mark).
func SaveLyrics(key, artist, title, album, plain, synced string, instrumental bool) {
	_, _ = lyricsColl.UpdateOne(context.TODO(),
		bson.M{"_id": key},
		bson.M{"$set": bson.M{
			"ARTIST":       artist,
			"TITLE":        title,
			"ALBUM":        album,
			"PLAIN":        plain,
			"SYNCED":       synced,
			"FOUND":        plain != "" || synced != "",
			"INSTRUMENTAL": instrumental,
			"CACHED_AT":    time.Now(),
		}},
		options.Update().SetUpsert(true),
	)
}

// CountAlbumsWithTracks reports how many albums have a non-empty DISCOGS.tracks
// array (used to sanity-check whether the sweep has anything to work with).
func CountAlbumsWithTracks() (int64, error) {
	return coll.CountDocuments(context.TODO(), bson.M{"DISCOGS.tracks.0": bson.M{"$exists": true}})
}

// FindTracksMissingLyrics returns up to `limit` album tracks that have no entry
// yet in the LYRICS cache. The normalized key is computed server-side to match
// lyricsKey (UPPER+TRIM of artist|track|album) and joined against LYRICS._id.
func FindTracksMissingLyrics(limit int) ([]bson.M, error) {
	upperTrim := func(field string) bson.M {
		return bson.M{"$toUpper": bson.M{"$trim": bson.M{"input": bson.M{"$ifNull": bson.A{field, ""}}}}}
	}
	pipeline := bson.A{
		bson.M{"$match": bson.M{"DISCOGS.tracks.0": bson.M{"$exists": true}}},
		bson.M{"$unwind": "$DISCOGS.tracks"},
		bson.M{"$match": bson.M{"DISCOGS.tracks.title": bson.M{"$nin": bson.A{"", nil}}}},
		bson.M{"$project": bson.M{
			"artist": "$ARTIST",
			"album":  "$TITLE",
			"track":  "$DISCOGS.tracks.title",
			"key": bson.M{"$concat": bson.A{
				upperTrim("$ARTIST"), "|", upperTrim("$DISCOGS.tracks.title"), "|", upperTrim("$TITLE"),
			}},
		}},
		bson.M{"$lookup": bson.M{
			"from":         LyricsCollectionName,
			"localField":   "key",
			"foreignField": "_id",
			"as":           "cached",
		}},
		bson.M{"$match": bson.M{"cached": bson.M{"$size": 0}}},
		bson.M{"$limit": int64(limit)},
	}

	cursor, err := coll.Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}
	var results []bson.M
	if err := cursor.All(context.TODO(), &results); err != nil {
		return nil, err
	}
	return results, nil
}

func GetAll() []models.Collection {
	cursor, _ := coll.Find(context.TODO(), bson.D{})

	var results []models.Collection
	if err := cursor.All(context.TODO(), &results); err != nil {
		return []models.Collection{}
	}
	return results
}

func GetArtists() []string {
	distinctArtists, err := coll.Distinct(context.TODO(), "ARTIST", bson.D{})
	if err != nil {
		return []string{err.Error()}
	}
	out := []string{}
	for _, v := range distinctArtists {
		out = append(out, v.(string))
	}
	return out

}

func GetMedia() map[string][]string {
	distinctMedia, err := coll.Distinct(context.TODO(), "MEDIA", bson.D{})
	if err != nil {
		return map[string][]string{
			"Error": strings.Split(err.Error(), "\n"),
		}
	}

	distinctOrigin, err := coll.Distinct(context.TODO(), "ORIGIN", bson.D{})
	if err != nil {
		return map[string][]string{
			"Error": strings.Split(err.Error(), "\n"),
		}
	}

	media := []string{}
	for _, v := range distinctMedia {
		media = append(media, v.(string))
	}
	origin := []string{}
	for _, v := range distinctOrigin {
		if v != nil {
			origin = append(origin, v.(string))
		}
	}
	// map[string][]string
	out := map[string][]string{
		"media":  media,
		"origin": origin,
	}
	return out

}
func GetTotals() map[string]map[string]int {
	// MEDIA ----------
	pipeline := bson.A{
		bson.M{
			Group: bson.M{
				"_id":   "$MEDIA",
				"total": bson.M{"$sum": 1},
			},
		},
	}
	cursor, err := coll.Aggregate(context.Background(), pipeline)
	if err != nil {
		panic(err)
	}

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		panic(err)
	}

	media := map[string]int{}

	for _, v := range results {
		if v["_id"] != nil {
			media[v["_id"].(string)] = int(v["total"].(int32))
		}
	}
	// RELEASE YEAR ----------
	pipeline = bson.A{
		bson.M{
			Group: bson.M{
				"_id":   "$RELEASE_YEAR",
				"total": bson.M{"$sum": 1},
			},
		},
	}
	cursor, err = coll.Aggregate(context.Background(), pipeline)
	if err != nil {
		panic(err)
	}

	var releaseYears []bson.M
	if err := cursor.All(context.Background(), &releaseYears); err != nil {
		panic(err)
	}

	releaseYearsResults := map[string]int{}

	for _, v := range releaseYears {
		releaseYearsResults[strconv.Itoa(int(v["_id"].(int32)))] = int(v["total"].(int32))
	}
	// PURCHASE YEAR ----------
	pipeline = bson.A{
		bson.M{
			Group: bson.M{
				"_id":   bson.M{"$year": "$PURCHASE"},
				"total": bson.M{"$sum": 1},
			},
		},
	}
	cursor, err = coll.Aggregate(context.Background(), pipeline)
	if err != nil {
		panic(err)
	}

	var purchaseYears []bson.M
	if err := cursor.All(context.Background(), &purchaseYears); err != nil {
		panic(err)
	}

	purchaseYearsResults := map[string]int{}

	for _, v := range purchaseYears {
		if v["_id"] != nil {
			purchaseYearsResults[strconv.Itoa(int(v["_id"].(int32)))] = int(v["total"].(int32))
		}
	}

	out := map[string]map[string]int{
		"media": media,
		"year":  releaseYearsResults,
		"buy":   purchaseYearsResults,
	}
	return out

}

func GetAlbunsbyArtist(artist string) []models.Collection {
	cursor, _ := coll.Find(context.TODO(), bson.M{"ARTIST": artist})

	var results []models.Collection
	if err := cursor.All(context.TODO(), &results); err != nil {
		return []models.Collection{}
	}
	return results
}

func Find(query map[string]interface{}) []models.Collection {
	findOptions := options.Find()
	findOptions.SetLimit(20)

	cursor, _ := coll.Find(context.TODO(), query, findOptions)

	var results []models.Collection

	if err := cursor.All(context.TODO(), &results); err != nil {
		return []models.Collection{}
	}
	return results
}

func FindAndSort(query map[string]interface{}, sortQuery map[string]interface{}) []models.Collection {
	findOptions := options.Find()
	findOptions.SetLimit(20)
	findOptions.SetSort(sortQuery)

	cursor, _ := coll.Find(context.TODO(), query, findOptions)

	var results []models.Collection

	if err := cursor.All(context.TODO(), &results); err != nil {
		return []models.Collection{}
	}
	return results
}

func Aggregate(query []map[string]interface{}) []bson.M {
	cursor, err := coll.Aggregate(context.Background(), query)
	if err != nil {
		panic(err)
	}

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		panic(err)
	}

	return results
}

func GetAlbunsbyID(id string) models.Collection {
	docID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Collection{}
	}
	cursor := coll.FindOne(context.TODO(), bson.M{"_id": docID})

	var results models.Collection

	if err := cursor.Decode(&results); err != nil {
		return models.Collection{}
	}

	return results
}

func GetAlbunsbyYear(year int, metric string) []interface{} {
	filter := bson.M{
		metric: year,
	}

	if metric == "PURCHASE" {
		filter = bson.M{
			"PURCHASE": bson.M{
				"$gte": time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC),
				"$lt":  time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC),
			},
		}
	}

	cursor, _ := coll.Find(context.TODO(), filter, options.Find().SetProjection(bson.M{
		"ARTIST": 1,
		"TITLE":  1,
		"MEDIA":  1,
		"PURCHASE": bson.M{
			"$dateToString": bson.M{
				"format": "%Y-%m-%d",
				"date":   "$PURCHASE",
			},
		},
	}))

	type Album struct {
		Artist   string `json:"artist"`
		Title    string `json:"title"`
		Media    string `json:"media"`
		Purchase string `json:"purchase"`
	}

	var results []Album

	if err := cursor.All(context.TODO(), &results); err != nil {
		return []interface{}{}
	}

	var out []interface{}
	for _, v := range results {
		out = append(out, v)
	}

	return out
}

func GetAlbuns(artist, media, origin string) []models.Collection {
	if artist == "" && media == "" && origin == "" {
		return GetAll()
	} else {
		filter := bson.M{}
		if artist != "" {
			filter["ARTIST"] = artist
		}
		if media != "" {
			filter["MEDIA"] = media
		}
		if origin != "" {
			filter["ORIGIN"] = origin
		}
		cursor, _ := coll.Find(context.TODO(), filter)

		var results []models.Collection
		if err := cursor.All(context.TODO(), &results); err != nil {
			return []models.Collection{}
		}
		return results
	}
}

func GetAlbunsbyTitle(title string) []models.Collection {
	cursor, _ := coll.Find(context.TODO(), bson.M{"TITLE": title})

	var results []models.Collection
	if err := cursor.All(context.TODO(), &results); err != nil {
		return []models.Collection{}
	}
	return results
}

func DeleteAlbumByID(id string) int64 {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return -1
	}

	result, err := coll.DeleteOne(context.TODO(), bson.M{
		"_id": oid,
	})
	if err != nil {
		return 0
	}
	return result.DeletedCount
}

func InsertAlbum(album models.Collection) string {
	// An album is identified by title AND artist: two different artists can
	// share a title (e.g. "On Air"), so dedup on both, not on title alone.
	if existing, err := coll.Find(context.TODO(),
		bson.M{"TITLE": album.Title, "ARTIST": album.Artist}); err == nil {
		var dupes []models.Collection
		if existing.All(context.TODO(), &dupes) == nil && len(dupes) > 0 {
			return "Album already exists"
		}
	}
	date, err := convertDate(album.Purchase)
	album.Purchase = nil

	if err == nil {
		album.Purchase = date
	}

	insertResult, err := coll.InsertOne(context.TODO(), album)
	if err != nil {
		return err.Error()
	}
	return insertResult.InsertedID.(primitive.ObjectID).Hex()
}

func UpdateAlbum(album models.Collection) int64 {
	date, err := convertDate(album.Purchase)
	album.Purchase = nil

	if err == nil {
		album.Purchase = date
	}

	updateResult, err := coll.ReplaceOne(context.TODO(), bson.M{"_id": album.ID}, album)
	if err != nil {
		return -1
	}
	return updateResult.ModifiedCount
}
