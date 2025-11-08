import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RouteOptimizationService } from './route-optimization.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';

@Controller()
export class RouteOptimizationController {
  constructor(
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  @MessagePattern('optimize-route')
  @UsePipes(new ValidationPipe({ transform: true }))
  async optimizeRoute(@Payload() optimizeDto: OptimizeRouteDto) {
    try {
      const result = await this.routeOptimizationService.optimizeRoute(
        optimizeDto,
      );
      return {
        success: true,
        data: result,
        message: 'Route optimized successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @MessagePattern('get-optimized-route')
  async getOptimizedRoute(@Payload() payload: { shipping_list_id: string; parent_id: string }) {
    try {
      const result = await this.routeOptimizationService.getOptimizedRoute(
        payload.shipping_list_id,
        payload.parent_id,
      );
      return {
        success: true,
        data: result,
        message: result ? 'Optimized route found' : 'No optimized route found',
      };
    } catch (error) {
      throw error;
    }
  }
}

