/**
 * ParkPlan AI — Location Detection Utilities
 *
 * Uses browser GPS coordinates and ParkPlan's own attraction/area anchors
 * to estimate the nearest useful park zone.
 */

import { getLocationZonesForPark } from "../parkLocationAnchors";

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadiusMeters = 6371000;
  const toRad = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function detectNearestLocationZone({ parkId, lat, lng }) {
  if (lat == null || lng == null) return null;

  const zones = getLocationZonesForPark(parkId);
  const candidates = [];

  Object.entries(zones).forEach(([landKey, zone]) => {
    const anchors = zone.anchors || [];

    anchors.forEach((anchor) => {
      const distanceMeters = getDistanceMeters(
        Number(lat),
        Number(lng),
        Number(anchor.lat),
        Number(anchor.lng)
      );

      candidates.push({
        parkId,
        landKey,
        landLabel: zone.label,
        anchorId: anchor.id,
        anchorName: anchor.name,
        anchorType: anchor.type,
        distanceMeters,
      });
    });
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);

  const best = candidates[0];

  let confidence = "low";
  if (best.distanceMeters <= 90) {
    confidence = "high";
  } else if (best.distanceMeters <= 180) {
    confidence = "medium";
  }

  return {
    ...best,
    distanceMeters: Math.round(best.distanceMeters),
    confidence,
    message:
      confidence === "low"
        ? `Closest match is ${best.landLabel}, near ${best.anchorName}, but GPS confidence is low.`
        : `Looks like you’re near ${best.landLabel}. Closest anchor: ${best.anchorName}.`,
  };
}

export function getCurrentPosition(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 30000,
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  });
}
