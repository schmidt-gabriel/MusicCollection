import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Small JSON cache used for offline support and instant loads
/// (stale-while-revalidate: views render the cached value immediately and
/// refresh it from the network in the background).
///
/// Small values live in SharedPreferences. Large payloads (the full album
/// catalog) live in a file and are encoded/decoded off the main isolate,
/// so they never freeze the UI.
class Cache {
  static const _prefix = 'cache:';

  static Future<dynamic> read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$key');
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  static Future<void> write(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', jsonEncode(value));
  }

  static Future<File> _fileFor(String key) async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/cache_$key.json');
  }

  /// Reads a large payload from disk, decoding it off the main isolate.
  static Future<dynamic> readLarge(String key) async {
    try {
      final file = await _fileFor(key);
      if (!await file.exists()) return null;
      final raw = await file.readAsString();
      return await compute(jsonDecode, raw);
    } catch (_) {
      return null;
    }
  }

  /// Writes a large payload to disk, encoding it off the main isolate.
  static Future<void> writeLarge(String key, dynamic value) async {
    final raw = await compute(jsonEncode, value);
    final file = await _fileFor(key);
    await file.writeAsString(raw);
    // Drop any stale copy from SharedPreferences (pre-file-cache versions):
    // multi-MB strings there make NSUserDefaults slow for every access.
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_prefix$key');
  }
}
