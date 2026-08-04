import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:plantrip/src/plantrip_app.dart';

void main() {
  testWidgets('PlanTripApp affiche l\'écran d\'accueil', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: PlanTripApp()),
    );

    expect(find.text('PlanTrip'), findsOneWidget);
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
