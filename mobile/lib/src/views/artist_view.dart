import 'dart:async';
import 'package:flutter/material.dart';
import 'settings_view.dart';
import 'albums_view.dart' as albums_view;
import 'album_view.dart';
import 'totals_view.dart';
import '../utils/api.dart';
import '../utils/cache.dart';
import '../models/album.dart';
import '../models/artist.dart';
import '../widgets/music_cards.dart';
import '../widgets/modern_app_bar.dart';

/// Home screen: artist list with global search (artists and album titles).
class ArtistListView extends StatefulWidget {
  const ArtistListView({super.key});

  static const routeName = '/artist';

  @override
  State<ArtistListView> createState() => _ArtistListViewState();
}

class _ArtistListViewState extends State<ArtistListView> {
  final api = API();
  bool _error = false;
  bool _offline = false;
  bool _loadedFromCache = false;
  TextEditingController editingController = TextEditingController();
  List<Artist> artists = [];
  List<Artist> artistsFiltered = [];
  Map<String, int> artistCounts = {};
  List<Album> albumResults = [];
  bool _searchingAlbums = false;
  Timer? _albumSearchDebounce;
  List<Album>? _catalog;
  Future<List<Album>>? _catalogFuture;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _albumSearchDebounce?.cancel();
    editingController.dispose();
    super.dispose();
  }

  Future<void> _load({bool forceNetwork = false}) async {
    // Serve the cache first so the list is instant and works offline.
    if (!forceNetwork && !_loadedFromCache) {
      final cachedArtists = await Cache.read('artists');
      final cachedCounts = await Cache.read('artist_counts');
      if (cachedArtists is List && mounted) {
        _loadedFromCache = true;
        setState(() {
          artists =
              cachedArtists.map((name) => Artist(name.toString())).toList();
          if (cachedCounts is Map) {
            artistCounts = cachedCounts
                .map((k, v) => MapEntry(k.toString(), (v as num).toInt()));
          }
          _applyFilter();
        });
      }
    }

    try {
      final fresh = await api.fetchArtists();
      await Cache.write('artists', fresh.map((a) => a.name).toList());
      if (mounted) {
        setState(() {
          artists = fresh;
          _error = false;
          _offline = false;
          _applyFilter();
        });
      }
      final counts = await api.fetchArtistCounts();
      await Cache.write('artist_counts', counts);
      if (mounted) {
        setState(() {
          artistCounts = counts;
        });
      }
    } catch (e) {
      if (!mounted) return;
      if (artists.isEmpty) {
        setState(() {
          _error = true;
        });
      } else {
        // Cache is on screen; the app bar icon signals the offline state.
        setState(() {
          _offline = true;
        });
      }
    }
  }

  void _applyFilter() {
    final query = editingController.text.toLowerCase();
    artistsFiltered = query.isEmpty
        ? artists
        : artists
            .where((artist) => artist.name.toLowerCase().contains(query))
            .toList();
  }

  /// Loads the whole collection once (cache first, then network) so album
  /// titles can be searched locally.
  Future<List<Album>> _loadCatalog() async {
    if (_catalog != null) return _catalog!;
    _catalogFuture ??= () async {
      final cached = await Cache.readLarge('all_albums');
      if (cached is List) {
        _catalog = cached.map((album) => Album.fromJSON(album)).toList();
        // Refresh in the background for the next search.
        api.fetchAllAlbums().then((albums) {
          _catalog = albums;
          Cache.writeLarge(
              'all_albums', albums.map((a) => a.toJson()).toList());
        }).catchError((_) {});
        return _catalog!;
      }
      final albums = await api.fetchAllAlbums();
      _catalog = albums;
      await Cache.writeLarge(
          'all_albums', albums.map((a) => a.toJson()).toList());
      return albums;
    }();
    try {
      return await _catalogFuture!;
    } catch (_) {
      _catalogFuture = null;
      rethrow;
    }
  }

  void _onSearchChanged() {
    setState(_applyFilter);

    _albumSearchDebounce?.cancel();
    final query = editingController.text.trim();
    if (query.length < 3) {
      setState(() {
        albumResults = [];
        _searchingAlbums = false;
      });
      return;
    }
    setState(() {
      _searchingAlbums = true;
    });
    _albumSearchDebounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final catalog = await _loadCatalog();
        if (!mounted || editingController.text.trim() != query) return;
        final lowerQuery = query.toLowerCase();
        final results = catalog
            .where((album) => album.title.toLowerCase().contains(lowerQuery))
            .take(50)
            .toList();
        setState(() {
          albumResults = results;
          _searchingAlbums = false;
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _searchingAlbums = false;
        });
      }
    });
  }

  int get _totalAlbums =>
      artistCounts.values.fold(0, (sum, count) => sum + count);

  Widget _collectionSummary(BuildContext context) {
    if (artists.isEmpty) return const SizedBox.shrink();
    final albums = _totalAlbums;
    final text = albums > 0
        ? "${artists.length} artistas · $albums discos"
        : "${artists.length} artistas";
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Text(
        text,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }

  Widget _sectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  Widget _artistTile(Artist artist) {
    return ArtistCard(
      artistName: artist.name,
      albumCount: artistCounts[artist.name],
      onTap: () {
        Navigator.restorablePushNamed(
          context,
          albums_view.AlbumsItemDetailsView.routeName,
          arguments: artist.name,
        );
      },
    );
  }

  Widget _albumTile(Album album) {
    return AlbumCard(
      title: album.title,
      subtitle: album.artist,
      imageUrl:
          album.discogs.coverImage.isNotEmpty ? album.discogs.coverImage : null,
      year: album.releaseYear > 0 ? album.releaseYear.toString() : null,
      onTap: () {
        Navigator.pushNamed(
          context,
          AlbumItemDetailsView.routeName,
          arguments: album.toJson(),
        );
      },
    );
  }

  Widget _buildBody(BuildContext context) {
    final query = editingController.text.trim();

    if (artists.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            LoadingCard(),
            SizedBox(height: 8),
            LoadingCard(),
            SizedBox(height: 8),
            LoadingCard(),
          ],
        ),
      );
    }

    // Search mode: artists section + album title matches.
    if (query.isNotEmpty) {
      final showAlbumSection =
          query.length >= 3 && (albumResults.isNotEmpty || _searchingAlbums);
      if (artistsFiltered.isEmpty && !showAlbumSection) {
        return EmptyState(
          icon: Icons.search_off,
          title: "Nada encontrado",
          subtitle: "Tente outros termos de busca",
        );
      }
      return ListView(
        padding: const EdgeInsets.only(bottom: 16),
        children: [
          if (artistsFiltered.isNotEmpty) ...[
            _sectionHeader(context, "Artistas"),
            ...artistsFiltered.map(_artistTile),
          ],
          if (showAlbumSection) ...[
            _sectionHeader(context, "Álbuns"),
            if (_searchingAlbums && albumResults.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                    child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2))),
              )
            else
              ...albumResults.map(_albumTile),
          ],
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: () => _load(forceNetwork: true),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 16),
        itemCount: artistsFiltered.length + 1,
        itemBuilder: (BuildContext context, int index) {
          if (index == 0) return _collectionSummary(context);
          return _artistTile(artistsFiltered[index - 1]);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_error) {
      return Scaffold(
        body: EmptyState(
          icon: Icons.wifi_off,
          title: "Sem conexão",
          subtitle: "Verifique sua internet e tente novamente",
          action: ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _error = false;
              });
              _load(forceNetwork: true);
            },
            icon: const Icon(Icons.refresh),
            label: const Text("Tentar novamente"),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: ModernAppBar(
        title: "Music Collection",
        hasSearch: true,
        searchController: editingController,
        searchHint: "Buscar artistas ou álbuns...",
        onSearchChanged: (value) => _onSearchChanged(),
        onSearchClear: () => _onSearchChanged(),
        actions: [
          if (_offline)
            const Padding(
              padding: EdgeInsets.only(right: 4),
              child: Tooltip(
                message: "Sem conexão: mostrando dados salvos",
                child: Icon(Icons.cloud_off, color: Colors.white70, size: 22),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.bar_chart),
            color: Colors.white,
            onPressed: () {
              Navigator.restorablePushNamed(context, TotalsView.routeName);
            },
            tooltip: "Estatísticas",
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            color: Colors.white,
            onPressed: () {
              Navigator.restorablePushNamed(context, SettingsView.routeName);
            },
            tooltip: "Configurações",
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: _buildBody(context),
      ),
    );
  }
}
