import '../models/album.dart';
import '../models/artist.dart';
import 'auth.dart';
import 'discogs.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class API {
  final http.Client client;
  final Future<String> Function() tokenProvider;
  final Future<String> Function() domainProvider;
  String? _apiURL;

  API({
    http.Client? client,
    Future<String> Function()? tokenProvider,
    Future<String> Function()? domainProvider,
  })  : client = client ?? http.Client(),
        tokenProvider = tokenProvider ?? AuthService.instance.accessToken,
        domainProvider = domainProvider ?? AuthService.instance.apiDomain;

  /// Resolves the API host once and caches it for the lifetime of this
  /// instance. The value comes from the Auth0 ID token custom claim, so
  /// changing it in Auth0 takes effect on the next login without a rebuild.
  Future<String> _domain() async => _apiURL ??= await domainProvider();

  Future<Map<String, String>> getHeaders() async {
    final token = await tokenProvider();
    return {
      "Authorization": "Bearer $token",
      "Content-Type": "application/json; charset=UTF-8",
    };
  }

  bool _isUnauthorized(http.Response response) {
    return response.statusCode == 401 ||
        utf8.decode(response.bodyBytes).contains("Failed to validate JWT.");
  }

  /// Sends a request and retries it once with a fresh token on 401.
  Future<http.Response> _send(
      Future<http.Response> Function(Map<String, String> headers)
          request) async {
    var response = await request(await getHeaders())
        .timeout(const Duration(seconds: 30));
    if (_isUnauthorized(response)) {
      response = await request(await getHeaders())
          .timeout(const Duration(seconds: 30));
    }
    return response;
  }

  List<Album> _decodeAlbums(http.Response response) {
    final decodedData = jsonDecode(utf8.decode(response.bodyBytes));
    if (decodedData is! List) return [];
    return decodedData.map((album) => Album.fromJSON(album)).toList();
  }

  Future<List<Album>> fetchAlbumByArtist(String artist) async {
    final apiURL = await _domain();
    final response = await _send((headers) => client.post(
        Uri.https(apiURL, "/album/artist"),
        headers: headers,
        body: jsonEncode(<String, String>{"artist": artist})));

    if (response.statusCode != 200) {
      throw Exception('Failed to load albums');
    }
    if (response.body.contains("Artist not found")) {
      return [];
    }
    return _decodeAlbums(response);
  }

  /// The whole collection, used for local album-title search. The payload
  /// is large, so the JSON is decoded off the main isolate.
  Future<List<Album>> fetchAllAlbums() async {
    final apiURL = await _domain();
    final response = await _send(
        (headers) => client.get(Uri.https(apiURL, "/all"), headers: headers));

    if (response.statusCode != 200) {
      throw Exception('Failed to load collection');
    }
    final decodedData = await compute(jsonDecode, utf8.decode(response.bodyBytes));
    if (decodedData is! List) return [];
    return decodedData.map((album) => Album.fromJSON(album)).toList();
  }

  Future<List<Artist>> fetchArtists() async {
    final apiURL = await _domain();
    final response = await _send((headers) =>
        client.get(Uri.https(apiURL, "/artists"), headers: headers));

    if (response.statusCode != 200) {
      throw Exception('Failed to load artists');
    }
    final decodedData = jsonDecode(utf8.decode(response.bodyBytes)) as List;
    return decodedData.map((artist) => Artist(artist)).toList();
  }

  /// Album count per artist, via the aggregation endpoint.
  Future<Map<String, int>> fetchArtistCounts() async {
    final apiURL = await _domain();
    final response = await _send((headers) => client.post(
        Uri.https(apiURL, "/aggregation"),
        headers: headers,
        body: jsonEncode([
          {
            "\$group": {
              "_id": "\$ARTIST",
              "total": {"\$sum": 1}
            }
          }
        ])));

    if (response.statusCode != 200) {
      throw Exception('Failed to load artist counts');
    }
    final decodedData = jsonDecode(utf8.decode(response.bodyBytes));
    if (decodedData is! List) return {};
    return {
      for (final entry in decodedData)
        if (entry["_id"] != null)
          entry["_id"].toString(): (entry["total"] as num).toInt()
    };
  }

  Future<String> handleAlbum(Album album) async {
    final apiURL = await _domain();
    final discogs = DiscogsAPI();
    final uri = album.id != ""
        ? Uri.https(apiURL, "/update/album")
        : Uri.https(apiURL, "/new/album");

    if (album.discogs.id == 0) {
      album.discogs = await discogs.get(album);
    }

    final response = await _send((headers) =>
        client.post(uri, headers: headers, body: jsonEncode(album.toJson())));

    if (response.statusCode == 502) {
      return "Servidor fora do ar";
    }
    return jsonDecode(response.body)["Message"].toString();
  }

  Future<int> deleteAlbum(Album album) async {
    final apiURL = await _domain();
    final response = await _send((headers) => client.post(
        Uri.https(apiURL, "/delete/album"),
        headers: headers,
        body: jsonEncode(<String, dynamic>{"id": album.id})));

    return jsonDecode(response.body)["Message"];
  }

  Future<Map<String, dynamic>> fetchTotals() async {
    final apiURL = await _domain();
    final response = await _send((headers) =>
        client.get(Uri.https(apiURL, "/totals"), headers: headers));

    if (response.statusCode != 200) {
      throw Exception('Failed to load totals');
    }
    return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
  }
}
