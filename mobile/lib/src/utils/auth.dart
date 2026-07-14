import 'dart:io';

import 'package:auth0_flutter/auth0_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Authentication via Auth0 Universal Login (Authorization Code + PKCE).
/// No client secret lives in the app: the user logs in once and the SDK
/// keeps the tokens in the keychain, renewing them with the refresh token.
class AuthService {
  AuthService._();

  static final AuthService instance = AuthService._();

  late final Auth0 _auth0 = Auth0(
    dotenv.get('OAUTH_DOMAIN'),
    dotenv.get('OAUTH_CLIENT_ID'),
  );

  Future<bool> isLoggedIn() {
    return _auth0.credentialsManager.hasValidCredentials();
  }

  /// Custom callback scheme used on Android (see android/app/build.gradle.kts).
  /// iOS keeps the default https scheme via ASWebAuthenticationSession, so we
  /// only override the scheme on Android.
  String? get _scheme => Platform.isAndroid ? 'com.gabriel.musicapp' : null;

  Future<void> login() async {
    await _auth0.webAuthentication(scheme: _scheme).login(
      audience: dotenv.get('OAUTH_AUDIENCE'),
      scopes: const {'openid', 'profile', 'email', 'offline_access'},
    );
  }

  /// Valid access token, renewed automatically by the credentials manager
  /// when close to expiry.
  Future<String> accessToken() async {
    final credentials = await _auth0.credentialsManager.credentials();
    return credentials.accessToken;
  }

  /// Reads a config value from the ID token custom claims so it can be changed
  /// in Auth0 (Action Secret) without rebuilding the app. The lookup ignores
  /// the claim namespace and matches by [name], so the Action can use any
  /// namespace. Falls back to the bundled .env value (only an optional
  /// local-dev convenience) and throws a clear error when neither is set.
  Future<String> _claimOrEnv(String name) async {
    try {
      final claims = (await _auth0.credentialsManager.credentials())
          .user
          .customClaims;
      final value = claims?.entries
          .firstWhere(
            (e) => e.key == name || e.key.endsWith('/$name'),
            orElse: () => const MapEntry('', null),
          )
          .value;
      if (value is String && value.trim().isNotEmpty) {
        return value.trim();
      }
    } catch (_) {
      // Fall through to the optional bundled default below.
    }
    final fallback = dotenv.maybeGet(name);
    if (fallback != null && fallback.trim().isNotEmpty) {
      return fallback.trim();
    }
    throw Exception('Config "$name" unavailable: the Auth0 token has no such '
        'claim and it is not set in .env.');
  }

  /// Backend API host.
  Future<String> apiDomain() => _claimOrEnv('API_DOMAIN');

  /// Discogs personal access token.
  Future<String> discogsToken() => _claimOrEnv('DISCOGS_TOKEN');

  Future<void> logout() async {
    try {
      await _auth0.webAuthentication(scheme: _scheme).logout();
    } finally {
      await _auth0.credentialsManager.clearCredentials();
    }
  }
}
