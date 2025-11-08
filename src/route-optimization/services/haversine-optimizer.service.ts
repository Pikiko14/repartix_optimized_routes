import { Injectable } from '@nestjs/common';
import { RoutePoint, OptimizedRoute } from '../interfaces/route-point.interface';

@Injectable()
export class HaversineOptimizerService {
  private readonly EARTH_RADIUS_KM = 6371;

  calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  nearestNeighbor(
    points: RoutePoint[],
    startPoint?: RoutePoint,
  ): RoutePoint[] {
    if (points.length === 0) return [];
    if (points.length === 1) return points;

    const unvisited = [...points];
    const route: RoutePoint[] = [];
    let current: RoutePoint;

    if (startPoint) {
      current = startPoint;
    } else {
      current = unvisited.shift();
      route.push({ ...current, sequence: 0 });
    }

    let sequence = 1;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateHaversineDistance(
          current.coords.lat,
          current.coords.lng,
          unvisited[i].coords.lat,
          unvisited[i].coords.lng,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0];
      route.push({ ...current, sequence: sequence++ });
    }

    return route;
  }

  twoOptImprovement(route: RoutePoint[]): RoutePoint[] {
    if (route.length < 4) return route;

    let improved = true;
    let bestRoute = [...route];
    let bestDistance = this.calculateTotalDistance(route);

    while (improved) {
      improved = false;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length; j++) {
          if (j - i === 1) continue;

          const newRoute = this.twoOptSwap(bestRoute, i, j);
          const newDistance = this.calculateTotalDistance(newRoute);

          if (newDistance < bestDistance) {
            bestRoute = newRoute;
            bestDistance = newDistance;
            improved = true;
          }
        }
      }
    }

    return bestRoute.map((point, index) => ({
      ...point,
      sequence: index,
    }));
  }

  private twoOptSwap(route: RoutePoint[], i: number, j: number): RoutePoint[] {
    const newRoute = [...route];
    const segment = newRoute.slice(i, j + 1).reverse();
    newRoute.splice(i, j - i + 1, ...segment);
    return newRoute;
  }

  calculateTotalDistance(route: RoutePoint[]): number {
    if (route.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateHaversineDistance(
        route[i].coords.lat,
        route[i].coords.lng,
        route[i + 1].coords.lat,
        route[i + 1].coords.lng,
      );
    }
    return total;
  }

  estimateDuration(distanceKm: number): number {
    const averageSpeedKmh = 30;
    return Math.round((distanceKm / averageSpeedKmh) * 60);
  }

  optimize(points: RoutePoint[], startPoint?: RoutePoint): OptimizedRoute {
    if (points.length === 0) {
      return {
        route: [],
        total_distance: 0,
        total_duration: 0,
        strategy: 'haversine',
      };
    }

    const initialRoute = this.nearestNeighbor(points, startPoint);
    const optimizedRoute = this.twoOptImprovement(initialRoute);
    const totalDistance = this.calculateTotalDistance(optimizedRoute);
    const totalDuration = this.estimateDuration(totalDistance);

    return {
      route: optimizedRoute,
      total_distance: Math.round(totalDistance * 100) / 100,
      total_duration: totalDuration,
      strategy: 'haversine',
    };
  }
}

