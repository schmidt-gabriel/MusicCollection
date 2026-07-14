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

const (
	CollectionName = "CD"
	Group          = "$group"
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

	coll = client.Database(database).Collection("CD")

	log.Printf("Connected to MongoDB! Collection %s", coll.Name())
	return coll
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
