/// Un lieu géographique identifié par ses coordonnées.
///
/// [Place] est une valeur, pas une entité : deux lieux portant les
/// mêmes coordonnées et le même nom sont interchangeables, sans
/// identité propre. Il est volontairement indépendant de toute
/// notion de voyage : il sera réutilisé par de futures
/// fonctionnalités (hébergements, points d'intérêt...).
final class Place {
  /// Crée un lieu.
  ///
  /// Lève une [ArgumentError] si [latitude] ou [longitude] sortent
  /// des bornes géographiques valides — une valeur incohérente à ce
  /// niveau est une erreur de programmation (fournisseur cartographique
  /// défaillant), pas un cas métier à faire remonter à l'utilisateur.
  Place({
    required this.name,
    required this.latitude,
    required this.longitude,
    this.country,
    this.region,
  }) {
    if (latitude < -90 || latitude > 90) {
      throw ArgumentError.value(
        latitude,
        'latitude',
        'doit être comprise entre -90 et 90',
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw ArgumentError.value(
        longitude,
        'longitude',
        'doit être comprise entre -180 et 180',
      );
    }
  }

  /// Nom affichable du lieu (ex. "Lisbonne, Portugal").
  final String name;

  /// Latitude en degrés décimaux, comprise entre -90 et 90.
  final double latitude;

  /// Longitude en degrés décimaux, comprise entre -180 et 180.
  final double longitude;

  /// Pays du lieu, lorsque le fournisseur de géocodage le renseigne.
  final String? country;

  /// Région ou état du lieu, lorsque le fournisseur de géocodage le
  /// renseigne.
  final String? region;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Place &&
        other.name == name &&
        other.latitude == latitude &&
        other.longitude == longitude &&
        other.country == country &&
        other.region == region;
  }

  @override
  int get hashCode => Object.hash(name, latitude, longitude, country, region);

  @override
  String toString() => 'Place($name, $latitude, $longitude)';
}
