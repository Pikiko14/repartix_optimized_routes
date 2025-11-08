import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { envs } from 'src/commons/configuration';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { RoutePoint, OptimizedRoute } from './interfaces/route-point.interface';
import { GoogleMapsOptimizerService } from './services/google-maps-optimizer.service';
import { HaversineOptimizerService } from './services/haversine-optimizer.service';
import { OptimizationStrategy } from './dto/optimize-route.dto';
import { OptimizedRouteRepository } from './repositories/optimized-route.repository';

@Injectable()
export class RouteOptimizationService {
  constructor(
    @Inject(envs.nats_service_name)
    private readonly client: ClientProxy,
    private readonly googleMapsOptimizer: GoogleMapsOptimizerService,
    private readonly haversineOptimizer: HaversineOptimizerService,
    private readonly routeRepository: OptimizedRouteRepository,
  ) {}

  async optimizeRoute(optimizeDto: OptimizeRouteDto): Promise<OptimizedRoute> {
    try {
      if (optimizeDto.shipping_list_id) {
        const existingRoute = await this.routeRepository.findByShippingListId(
          optimizeDto.shipping_list_id,
          optimizeDto.parent_id,
        );

        if (existingRoute) {
          throw new RpcException({
            message: 'Shipping list already has an optimized route. Cannot generate a new one.',
            status: HttpStatus.BAD_REQUEST,
          });
        }

        const shippingList = await firstValueFrom(
          this.client.send('find-one-shipping-list', {
            id: optimizeDto.shipping_list_id,
            parent_id: optimizeDto.parent_id,
          }),
        );

        if (!shippingList || !shippingList.shippingList) {
          throw new RpcException({
            message: 'Shipping list not found',
            status: HttpStatus.NOT_FOUND,
          });
        }
      }

      const orders = await this.getOrders(optimizeDto);

      if (!orders || orders.length === 0) {
        throw new RpcException({
          message: 'No orders found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const routePoints = this.buildRoutePoints(orders);
      const startPoint = optimizeDto.start_location
        ? {
            order_id: 'start',
            type: 'sender' as const,
            coords: optimizeDto.start_location,
            address: optimizeDto.start_location.address || 'Start point',
            sequence: 0,
          }
        : undefined;

      let optimizedRoute: OptimizedRoute;

      if (optimizeDto.strategy === OptimizationStrategy.GOOGLE_MAPS) {
        const googleMapsApiKey = await this.getUserGoogleMapsApiKey(
          optimizeDto.user_request_id || optimizeDto.parent_id,
        );

        if (!googleMapsApiKey) {
          throw new RpcException({
            message: 'Google Maps API key is not configured in user settings',
            status: HttpStatus.BAD_REQUEST,
          });
        }

        optimizedRoute = await this.googleMapsOptimizer.optimize(
          routePoints,
          startPoint,
          googleMapsApiKey,
        );
      } else {
        optimizedRoute = this.haversineOptimizer.optimize(
          routePoints,
          startPoint,
        );
      }

      if (optimizeDto.shipping_list_id) {
        await this.routeRepository.create({
          shipping_list_id: optimizeDto.shipping_list_id,
          parent_id: optimizeDto.parent_id,
          route: optimizedRoute.route,
          total_distance: optimizedRoute.total_distance,
          total_duration: optimizedRoute.total_duration,
          strategy: optimizedRoute.strategy,
          metadata: optimizedRoute.metadata,
          start_location: optimizeDto.start_location,
        });
      }

      return optimizedRoute;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        message: error.message || 'Error optimizing route',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  private async getUserGoogleMapsApiKey(userId: string): Promise<string | null> {
    try {
      const configResponse = await firstValueFrom(
        this.client.send('find-configuration', userId),
      );

      return configResponse?.configuration?.gmap_api__key || null;
    } catch (error) {
      return null;
    }
  }

  private async getOrders(optimizeDto: OptimizeRouteDto): Promise<any[]> {
    if (optimizeDto.shipping_list_id) {
      const shippingList = await firstValueFrom(
        this.client.send('find-one-shipping-list', {
          id: optimizeDto.shipping_list_id,
          parent_id: optimizeDto.parent_id,
        }),
      );

      if (!shippingList || !shippingList.shippingList) {
        throw new RpcException({
          message: 'Shipping list not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const orderIds = shippingList.shippingList.orders.map(
        (order: any) => order.id,
      );

      if (orderIds.length === 0) {
        return [];
      }

      return await firstValueFrom(
        this.client.send('get-orders-by-id-array', orderIds),
      );
    } else if (optimizeDto.order_ids && optimizeDto.order_ids.length > 0) {
      return await firstValueFrom(
        this.client.send('get-orders-by-id-array', optimizeDto.order_ids),
      );
    } else {
      throw new RpcException({
        message: 'Either shipping_list_id or order_ids must be provided',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private buildRoutePoints(orders: any[]): RoutePoint[] {
    const points: RoutePoint[] = [];

    orders.forEach((order) => {
      if (order.sender?.address?.coords) {
        points.push({
          order_id: order._id || order.id,
          reference: order.reference,
          type: 'sender',
          coords: order.sender.address.coords,
          address: order.sender.address.address || '',
          name: order.sender.brand_name,
          sequence: undefined,
        });
      }

      if (order.client?.coords) {
        points.push({
          order_id: order._id || order.id,
          reference: order.reference,
          type: 'client',
          coords: order.client.coords,
          address: order.client.address || '',
          name: `${order.client.name} ${order.client.last_name}`.trim(),
          sequence: undefined,
        });
      }
    });

    return points;
  }

  async getOptimizedRoute(
    shippingListId: string,
    parentId: string,
  ): Promise<OptimizedRoute | null> {
    try {
      const route = await this.routeRepository.findByShippingListId(
        shippingListId,
        parentId,
      );

      if (!route) {
        return null;
      }

      return {
        route: route.route.map((point) => ({
          order_id: point.order_id,
          reference: point.reference,
          type: point.type as 'sender' | 'client',
          coords: {
            lat: point.coords.lat,
            lng: point.coords.lng,
          },
          address: point.address,
          name: point.name,
          sequence: point.sequence,
        })),
        total_distance: route.total_distance,
        total_duration: route.total_duration,
        strategy: route.strategy,
        metadata: route.metadata,
      };
    } catch (error) {
      throw new RpcException({
        message: error.message || 'Error getting optimized route',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

