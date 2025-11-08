import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { RoutePoint, OptimizedRoute } from '../interfaces/route-point.interface';

@Injectable()
export class GoogleMapsOptimizerService {
  private readonly API_BASE_URL = 'https://maps.googleapis.com/maps/api';

  constructor() {}

  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
    apiKey: string,
  ): Promise<any> {
    const originStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
    const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/distancematrix/json`,
        {
          params: {
            origins: originStr,
            destinations: destStr,
            key: apiKey,
            units: 'metric',
            mode: 'driving',
          },
        },
      );

      if (response.data.status !== 'OK') {
        throw new HttpException(
          `Google Maps API error: ${response.data.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          `Google Maps API error: ${error.response.data.error_message || error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getDirections(
    waypoints: Array<{ lat: number; lng: number }>,
    apiKey: string,
    startPoint?: { lat: number; lng: number },
    endPoint?: { lat: number; lng: number },
  ): Promise<any> {
    let origin: string;
    let destination: string;
    let waypointsStr: string;

    if (startPoint && endPoint) {
      origin = `${startPoint.lat},${startPoint.lng}`;
      destination = `${endPoint.lat},${endPoint.lng}`;
      waypointsStr = waypoints
        .map((w) => `${w.lat},${w.lng}`)
        .join('|');
    } else if (waypoints.length > 0) {
      origin = `${waypoints[0].lat},${waypoints[0].lng}`;
      destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
      waypointsStr = waypoints
        .slice(1, -1)
        .map((w) => `${w.lat},${w.lng}`)
        .join('|');
    } else {
      throw new HttpException(
        'At least one waypoint is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const params: any = {
        origin,
        destination,
        key: apiKey,
        mode: 'driving',
        optimize: true,
      };

      if (waypointsStr) {
        params.waypoints = `optimize:true|${waypointsStr}`;
      }

      const response = await axios.get(`${this.API_BASE_URL}/directions/json`, {
        params,
      });

      if (response.data.status !== 'OK') {
        throw new HttpException(
          `Google Directions API error: ${response.data.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          `Google Directions API error: ${error.response.data.error_message || error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async optimize(
    points: RoutePoint[],
    startPoint: RoutePoint | undefined,
    apiKey: string,
  ): Promise<OptimizedRoute> {
    if (!apiKey) {
      throw new HttpException(
        'Google Maps API key is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (points.length === 0) {
      return {
        route: [],
        total_distance: 0,
        total_duration: 0,
        strategy: 'google_maps',
      };
    }

    const waypoints = points.map((p) => ({
      lat: p.coords.lat,
      lng: p.coords.lng,
    }));

    const start = startPoint
      ? { lat: startPoint.coords.lat, lng: startPoint.coords.lng }
      : waypoints[0];
    const end = waypoints[waypoints.length - 1];

    const directions = await this.getDirections(waypoints, apiKey, start, end);

    if (!directions.routes || directions.routes.length === 0) {
      throw new HttpException(
        'No routes found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const route = directions.routes[0];
    const optimizedWaypointOrder = route.waypoint_order || [];

    const optimizedPoints: RoutePoint[] = [];
    let sequence = 0;

    if (startPoint && (startPoint.coords.lat !== waypoints[0].lat || startPoint.coords.lng !== waypoints[0].lng)) {
      optimizedPoints.push({ ...startPoint, sequence: sequence++ });
    }

    if (optimizedWaypointOrder.length > 0) {
      optimizedWaypointOrder.forEach((index: number) => {
        const point = points[index];
        optimizedPoints.push({
          ...point,
          sequence: sequence++,
        });
      });
    } else {
      points.forEach((point) => {
        optimizedPoints.push({
          ...point,
          sequence: sequence++,
        });
      });
    }

    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach((leg: any) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });

    return {
      route: optimizedPoints,
      total_distance: Math.round((totalDistance / 1000) * 100) / 100,
      total_duration: Math.round(totalDuration / 60),
      strategy: 'google_maps',
      metadata: {
        directions: route,
      },
    };
  }
}

