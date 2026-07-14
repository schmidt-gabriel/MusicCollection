import 'package:flutter/material.dart';
import 'package:music_app/src/views/handle_album.dart';
import '../settings/settings_controller.dart';
import '../models/album.dart';
import '../utils/api.dart';
import '../utils/cache.dart';
import '../widgets/music_cards.dart';
import '../widgets/modern_app_bar.dart';
import 'album_view.dart';

/// Displays the albums of a given artist.
class AlbumsItemDetailsView extends StatefulWidget {
  final Object artist;
  const AlbumsItemDetailsView({super.key, required this.artist, required this.controller});

  static const routeName = '/discograpy';
  final SettingsController controller;

  @override
  State<AlbumsItemDetailsView> createState() => _AlbumsItemDetailsViewState();
}

enum SortOption {
  none,
  releaseYearAsc,
  releaseYearDesc,
  titleAsc,
  titleDesc
}

class _AlbumsItemDetailsViewState extends State<AlbumsItemDetailsView> {
  final api = API();
  SortOption _currentSort = SortOption.releaseYearAsc;
  List<Album>? _albums;
  bool _loading = true;
  bool _error = false;
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    _loadAlbums();
  }

  String get _cacheKey => 'albums:${widget.artist}';

  Future<void> _loadAlbums() async {
    // Serve the cache first so the list is instant and works offline.
    if (_albums == null) {
      final cached = await Cache.read(_cacheKey);
      if (cached is List && mounted) {
        setState(() {
          _albums = cached.map((album) => Album.fromJSON(album)).toList();
          _loading = false;
        });
      }
    }

    try {
      final albums = await api.fetchAlbumByArtist(widget.artist as String);
      await Cache.write(
          _cacheKey, albums.map((album) => album.toJson()).toList());
      if (!mounted) return;
      setState(() {
        _albums = albums;
        _loading = false;
        _error = false;
        _offline = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (_albums != null) {
        // Cache is on screen; the app bar icon signals the offline state.
        setState(() {
          _offline = true;
        });
        return;
      }
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  Future<void> _refresh() {
    return _loadAlbums();
  }

  // Compare release years, pushing albums without one to the end.
  int _compareYears(Album a, Album b, {bool descending = false}) {
    if (a.releaseYear <= 0 && b.releaseYear <= 0) return 0;
    if (a.releaseYear <= 0) return 1;
    if (b.releaseYear <= 0) return -1;
    return descending
        ? b.releaseYear.compareTo(a.releaseYear)
        : a.releaseYear.compareTo(b.releaseYear);
  }

  List<Album> _sortAlbums(List<Album> albums) {
    List<Album> sortedAlbums = List.from(albums);

    switch (_currentSort) {
      case SortOption.releaseYearAsc:
        sortedAlbums.sort(_compareYears);
        break;
      case SortOption.releaseYearDesc:
        sortedAlbums.sort((a, b) => _compareYears(a, b, descending: true));
        break;
      case SortOption.titleAsc:
        sortedAlbums.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
        break;
      case SortOption.titleDesc:
        sortedAlbums.sort((a, b) => b.title.toLowerCase().compareTo(a.title.toLowerCase()));
        break;
      case SortOption.none:
        break;
    }

    return sortedAlbums;
  }

  BoxDecoration _backgroundGradient(BuildContext context) {
    return BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
          Theme.of(context).colorScheme.surface,
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) {
      return Container(
        decoration: _backgroundGradient(context),
        child: const Column(
          children: [
            SizedBox(height: 16),
            LoadingCard(),
            SizedBox(height: 8),
            LoadingCard(),
            SizedBox(height: 8),
            LoadingCard(),
          ],
        ),
      );
    }

    if (_error) {
      return EmptyState(
        icon: Icons.error_outline,
        title: "Algo deu errado",
        subtitle: "Não foi possível carregar os discos. Tente novamente.",
        action: ElevatedButton.icon(
          onPressed: () {
            setState(() {
              _loading = true;
            });
            _loadAlbums();
          },
          icon: const Icon(Icons.refresh),
          label: const Text("Tentar novamente"),
        ),
      );
    }

    if (_albums == null || _albums!.isEmpty) {
      return EmptyState(
        icon: Icons.album_outlined,
        title: "Nenhum disco encontrado",
        subtitle: "Este artista ainda não tem discos na coleção.",
      );
    }

    final albums = _sortAlbums(_albums!);

    return Container(
      decoration: _backgroundGradient(context),
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: albums.length,
          itemBuilder: (BuildContext context, int index) {
            final Album album = albums[index];
            return AlbumCard(
              title: album.title,
              imageUrl: album.discogs.coverImage.isNotEmpty
                  ? album.discogs.coverImage
                  : null,
              year: album.releaseYear > 0 ? album.releaseYear.toString() : null,
              onTap: () async {
                final result = await Navigator.pushNamed(
                  context,
                  AlbumItemDetailsView.routeName,
                  arguments: album.toJson(),
                );
                if (result == null) return;
                if (result == "updated") {
                  _loadAlbums();
                } else {
                  setState(() {
                    _albums!.removeWhere((a) => a.id == result);
                  });
                }
              },
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientAppBar(
        title: widget.artist as String,
        centerTitle: false,
        actions: [
          if (_offline)
            const Padding(
              padding: EdgeInsets.only(right: 4),
              child: Tooltip(
                message: "Sem conexão: mostrando dados salvos",
                child: Icon(Icons.cloud_off, color: Colors.white70, size: 22),
              ),
            ),
          PopupMenuButton<SortOption>(
            icon: const Icon(Icons.sort),
            tooltip: 'Ordenar',
            onSelected: (SortOption option) {
              setState(() {
                _currentSort = option;
              });
            },
            itemBuilder: (BuildContext context) => [
              const PopupMenuItem(
                value: SortOption.releaseYearAsc,
                child: Text('Lançamento (mais antigo)'),
              ),
              const PopupMenuItem(
                value: SortOption.releaseYearDesc,
                child: Text('Lançamento (mais recente)'),
              ),
              const PopupMenuItem(
                value: SortOption.titleAsc,
                child: Text('Título (A-Z)'),
              ),
              const PopupMenuItem(
                value: SortOption.titleDesc,
                child: Text('Título (Z-A)'),
              ),
            ],
          ),
        ],
      ),
      body: _buildBody(context),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.pushNamed(
            context,
            HandleAlbumView.routeName,
            arguments: Album.fromJSON({"artist": widget.artist}),
          );
          if (result != null) {
            _loadAlbums();
          }
        },
        tooltip: 'Adicionar disco',
        child: const Icon(Icons.add),
      ),
    );
  }
}
