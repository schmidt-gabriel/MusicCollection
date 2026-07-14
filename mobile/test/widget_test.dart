import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:music_app/src/widgets/music_cards.dart';

Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('ArtistCard', () {
    testWidgets('shows the artist name and album count',
        (WidgetTester tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(ArtistCard(
        artistName: 'IRON MAIDEN',
        albumCount: 12,
        onTap: () => tapped = true,
      )));

      expect(find.text('IRON MAIDEN'), findsOneWidget);
      expect(find.text('12 discos'), findsOneWidget);

      await tester.tap(find.byType(ArtistCard));
      expect(tapped, isTrue);
    });

    testWidgets('uses the singular label for one album',
        (WidgetTester tester) async {
      await tester.pumpWidget(wrap(ArtistCard(
        artistName: 'RUSH',
        albumCount: 1,
        onTap: () {},
      )));

      expect(find.text('1 disco'), findsOneWidget);
    });
  });

  group('AlbumCard', () {
    testWidgets('joins subtitle and year on one line',
        (WidgetTester tester) async {
      await tester.pumpWidget(wrap(AlbumCard(
        title: 'Moving Pictures',
        subtitle: 'RUSH',
        year: '1981',
        onTap: () {},
      )));

      expect(find.text('Moving Pictures'), findsOneWidget);
      expect(find.text('RUSH · 1981'), findsOneWidget);
    });
  });

  group('EmptyState', () {
    testWidgets('renders title, subtitle and action',
        (WidgetTester tester) async {
      await tester.pumpWidget(wrap(EmptyState(
        icon: Icons.wifi_off,
        title: 'Sem conexão',
        subtitle: 'Verifique sua internet',
        action: ElevatedButton(onPressed: () {}, child: const Text('Tentar')),
      )));

      expect(find.text('Sem conexão'), findsOneWidget);
      expect(find.text('Verifique sua internet'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });
  });
}
