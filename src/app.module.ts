import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouteOptimizationModule } from './route-optimization/route-optimization.module';
import { envs } from './commons/configuration';

@Module({
  imports: [
    RouteOptimizationModule,
    MongooseModule.forRoot(
      envs.app_env === 'production' ? envs.atlas_url : envs.db_url,
    ),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

