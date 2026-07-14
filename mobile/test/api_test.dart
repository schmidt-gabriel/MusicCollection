import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:music_app/src/utils/api.dart';

const _envFixture = '''
OAUTH_DOMAIN=auth.test
OAUTH_CLIENT_ID=id
OAUTH_AUDIENCE=aud
DISCOGS_TOKEN=discogs
''';

API buildAPI(MockClient client, {List<String>? issuedTokens}) {
  final tokens = issuedTokens ?? ['token-1', 'token-2'];
  var call = 0;
  return API(
    client: client,
    tokenProvider: () async => tokens[call < tokens.length ? call++ : call - 1],
    domainProvider: () async => 'api.test',
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  dotenv.testLoad(fileInput: _envFixture);

  group('API', () {
    test('fetchAlbumByArtist parses albums from a 200 response', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/album/artist');
        expect(request.headers['Authorization'], 'Bearer token-1');
        return http.Response(
            jsonEncode([
              {'title': 'Powerslave', 'artist': 'IRON MAIDEN', 'releaseYear': 1984},
              {'title': 'Killers', 'artist': 'IRON MAIDEN', 'releaseYear': 1981},
            ]),
            200);
      });

      final albums = await buildAPI(client).fetchAlbumByArtist('IRON MAIDEN');
      expect(albums.length, 2);
      expect(albums.first.title, 'Powerslave');
      expect(albums.first.releaseYear, 1984);
    });

    test('fetchAlbumByArtist returns empty list when artist is not found',
        () async {
      final client = MockClient(
          (request) async => http.Response('Artist not found', 200));

      final albums = await buildAPI(client).fetchAlbumByArtist('NOBODY');
      expect(albums, isEmpty);
    });

    test('retries exactly once with a fresh token on 401', () async {
      var apiCalls = 0;
      final client = MockClient((request) async {
        apiCalls++;
        if (apiCalls == 1) {
          expect(request.headers['Authorization'], 'Bearer token-1');
          return http.Response('unauthorized', 401);
        }
        expect(request.headers['Authorization'], 'Bearer token-2');
        return http.Response(jsonEncode([]), 200);
      });

      final artists = await buildAPI(client).fetchArtists();
      expect(artists, isEmpty);
      expect(apiCalls, 2);
    });

    test('a request that stays 401 after the retry throws', () async {
      final client =
          MockClient((request) async => http.Response('unauthorized', 401));

      expect(buildAPI(client).fetchArtists(), throwsException);
    });

    test('fetchArtistCounts maps the aggregation result', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/aggregation');
        final body = jsonDecode(request.body) as List;
        expect(body.first['\$group']['_id'], '\$ARTIST');
        return http.Response(
            jsonEncode([
              {'_id': 'IRON MAIDEN', 'total': 12},
              {'_id': 'RUSH', 'total': 20},
              {'_id': null, 'total': 1},
            ]),
            200);
      });

      final counts = await buildAPI(client).fetchArtistCounts();
      expect(counts['IRON MAIDEN'], 12);
      expect(counts['RUSH'], 20);
      expect(counts.length, 2);
    });

    test('fetchAllAlbums loads the whole collection', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/all');
        return http.Response(
            jsonEncode([
              {'title': 'Moving Pictures', 'artist': 'RUSH', 'releaseYear': 1981},
              {'title': 'Paranoid', 'artist': 'BLACK SABBATH', 'releaseYear': 1970},
            ]),
            200);
      });

      final albums = await buildAPI(client).fetchAllAlbums();
      expect(albums.length, 2);
      expect(albums.last.artist, 'BLACK SABBATH');
    });

    test('fetchTotals parses the totals map', () async {
      final client = MockClient((request) async => http.Response(
          jsonEncode({
            'media': {'CD': 100, 'VINIL': 50},
            'buy': {'2024': 30},
            'year': {'1984': 10},
          }),
          200));

      final totals = await buildAPI(client).fetchTotals();
      expect(totals['media']['CD'], 100);
      expect(totals['buy']['2024'], 30);
    });
  });
}
