import 'package:flutter/material.dart';
import '../utils/auth.dart';
import 'artist_view.dart';

/// First screen when there is no valid session: launches the Auth0
/// Universal Login (Authorization Code + PKCE).
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  static const routeName = '/login';

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  bool _busy = false;

  Future<void> _login() async {
    setState(() {
      _busy = true;
    });
    try {
      await AuthService.instance.login();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, ArtistListView.routeName);
    } catch (e) {
      debugPrint("Login failed: $e");
      if (!mounted) return;
      setState(() {
        _busy = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Não foi possível entrar. Tente novamente.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.primary.withValues(alpha: 0.15),
              colorScheme.surface,
            ],
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [colorScheme.primary, colorScheme.secondary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: const Icon(Icons.album, color: Colors.white, size: 52),
                ),
                const SizedBox(height: 24),
                Text(
                  "Music Collection",
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Entre para acessar sua coleção",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _busy ? null : _login,
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: Text(_busy ? "Entrando..." : "Entrar"),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Decides the first screen based on whether a valid session exists.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: AuthService.instance.isLoggedIn(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return snapshot.data! ? const ArtistListView() : const LoginView();
      },
    );
  }
}
