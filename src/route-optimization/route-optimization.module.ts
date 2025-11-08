import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouteOptimizationController } from './route-optimization.controller';
import { RouteOptimizationService } from './route-optimization.service';
import { GoogleMapsOptimizerService } from './services/google-maps-optimizer.service';
import { HaversineOptimizerService } from './services/haversine-optimizer.service';
import { NatsModule } from '../transports/nats.module';
import {
  OptimizedRoute,
  OptimizedRouteSchema,
} from './schemas/optimized-route.schema';
import { OptimizedRouteRepository } from './repositories/optimized-route.repository';

@Module({
  imports: [
    NatsModule,
    MongooseModule.forFeature([
      { name: OptimizedRoute.name, schema: OptimizedRouteSchema },
    ]),
  ],
  controllers: [RouteOptimizationController],
  providers: [
    RouteOptimizationService,
    GoogleMapsOptimizerService,
    HaversineOptimizerService,
    OptimizedRouteRepository,
  ],
})
export class RouteOptimizationModule {}

