import 'package:flutter/material.dart';
import '../utils/api.dart';
import '../utils/cache.dart';
import '../widgets/modern_app_bar.dart';
import 'settings_view.dart';

enum SortOption {
  countDesc,
  countAsc
}

/// Displays totals statistics for media types, buy years and release decades.
class TotalsView extends StatefulWidget {
  const TotalsView({super.key});

  static const routeName = '/totals';

  @override
  State<TotalsView> createState() => _TotalsViewState();
}

class _TotalsViewState extends State<TotalsView> {
  final api = API();
  Map<String, dynamic>? totalsData;
  bool isLoading = true;
  bool hasError = false;
  bool _offline = false;
  String errorMessage = '';
  SortOption _currentSort = SortOption.countDesc;

  @override
  void initState() {
    super.initState();
    _loadTotals();
  }

  Future<void> _loadTotals() async {
    // Serve the cache first so the screen is instant and works offline.
    if (totalsData == null) {
      final cached = await Cache.read('totals');
      if (cached is Map<String, dynamic> && mounted) {
        setState(() {
          totalsData = cached;
          isLoading = false;
        });
      }
    }

    try {
      final data = await api.fetchTotals();
      await Cache.write('totals', data);
      if (!mounted) return;
      setState(() {
        totalsData = data;
        isLoading = false;
        hasError = false;
        _offline = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (totalsData != null) {
        // Cache is on screen; the app bar icon signals the offline state.
        setState(() {
          isLoading = false;
          _offline = true;
        });
        return;
      }
      setState(() {
        hasError = true;
        errorMessage = e.toString();
        isLoading = false;
      });
    }
  }

  List<MapEntry<String, dynamic>> _sortMediaData(Map<String, dynamic> mediaData) {
    List<MapEntry<String, dynamic>> sortedEntries = mediaData.entries.toList();

    switch (_currentSort) {
      case SortOption.countDesc:
        sortedEntries.sort((a, b) => (b.value as int).compareTo(a.value as int));
        break;
      case SortOption.countAsc:
        sortedEntries.sort((a, b) => (a.value as int).compareTo(b.value as int));
        break;
    }

    return sortedEntries;
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 24, 8, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }

  Widget _buildMediaCard(String mediaType, int count, int total) {
    final fraction = total > 0 ? count / total : 0.0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    mediaType,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    count.toString(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: fraction,
                      minHeight: 6,
                      backgroundColor:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '${(fraction * 100).toStringAsFixed(1)}%',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).hintColor,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Compact bar row used by the year/decade sections, scaled to the
  /// largest count in the section.
  Widget _buildYearRow(String label, int count, int maxCount) {
    final fraction = maxCount > 0 ? count / maxCount : 0.0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 10,
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 44,
            child: Text(
              count.toString(),
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  /// Parses a {year: count} map into sorted (label, count) pairs.
  List<MapEntry<int, int>> _yearEntries(Map<String, dynamic> data) {
    final entries = <MapEntry<int, int>>[];
    data.forEach((key, value) {
      final year = int.tryParse(key);
      if (year != null && year > 0 && value is num) {
        entries.add(MapEntry(year, value.toInt()));
      }
    });
    entries.sort((a, b) => b.key.compareTo(a.key));
    return entries;
  }

  /// Groups release years into decades ("1970", "1980", ...).
  List<MapEntry<int, int>> _decadeEntries(Map<String, dynamic> data) {
    final decades = <int, int>{};
    for (final entry in _yearEntries(data)) {
      final decade = (entry.key ~/ 10) * 10;
      decades[decade] = (decades[decade] ?? 0) + entry.value;
    }
    final entries = decades.entries.toList();
    entries.sort((a, b) => b.key.compareTo(a.key));
    return entries;
  }

  Widget _buildYearSection(String title, List<MapEntry<int, int>> entries,
      {String Function(int)? labelBuilder}) {
    if (entries.isEmpty) return const SizedBox.shrink();
    final maxCount =
        entries.map((e) => e.value).reduce((a, b) => a > b ? a : b);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(title),
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              children: entries
                  .map((entry) => _buildYearRow(
                        labelBuilder != null
                            ? labelBuilder(entry.key)
                            : entry.key.toString(),
                        entry.value,
                        maxCount,
                      ))
                  .toList(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent() {
    final mediaData = totalsData!['media'] as Map<String, dynamic>? ?? {};
    final buyData = totalsData!['buy'] as Map<String, dynamic>? ?? {};
    final yearData = totalsData!['year'] as Map<String, dynamic>? ?? {};

    final totalCount = mediaData.values
        .whereType<num>()
        .fold<int>(0, (sum, count) => sum + count.toInt());
    final sortedMedia = _sortMediaData(mediaData);

    return ListView(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 24),
      children: [
        if (mediaData.isNotEmpty) ...[
          _sectionHeader('Por tipo de mídia'),
          ...sortedMedia.map((entry) => _buildMediaCard(
                entry.key,
                (entry.value as num).toInt(),
                totalCount,
              )),
        ],
        _buildYearSection('Compras por ano', _yearEntries(buyData)),
        _buildYearSection('Lançamentos por década', _decadeEntries(yearData),
            labelBuilder: (decade) => "${decade}s"),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (hasError) {
      return Scaffold(
        appBar: GradientAppBar(
          title: 'Estatísticas',
          actions: [
            IconButton(
              icon: const Icon(Icons.settings),
              color: Colors.white,
              onPressed: () {
                Navigator.restorablePushNamed(context, SettingsView.routeName);
              },
            ),
          ],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Erro ao carregar as estatísticas',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                errorMessage,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    isLoading = true;
                    hasError = false;
                  });
                  _loadTotals();
                },
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: GradientAppBar(
        title: 'Estatísticas',
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
            icon: const Icon(Icons.sort, color: Colors.white),
            tooltip: 'Ordenar',
            onSelected: (SortOption option) {
              setState(() {
                _currentSort = option;
              });
            },
            itemBuilder: (BuildContext context) => [
              const PopupMenuItem(
                value: SortOption.countDesc,
                child: Text('Maior quantidade primeiro'),
              ),
              const PopupMenuItem(
                value: SortOption.countAsc,
                child: Text('Menor quantidade primeiro'),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            color: Colors.white,
            onPressed: () {
              setState(() {
                isLoading = true;
              });
              _loadTotals();
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            color: Colors.white,
            onPressed: () {
              Navigator.restorablePushNamed(context, SettingsView.routeName);
            },
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : totalsData == null
              ? const Center(child: Text('Sem dados disponíveis'))
              : _buildContent(),
    );
  }
}
