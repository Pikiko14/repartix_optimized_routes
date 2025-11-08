import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OptimizedRouteDocument = OptimizedRoute & Document;

@Schema({ _id: false })
class Coords {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;
}

@Schema({ _id: false })
class RoutePoint {
  @Prop()
  order_id?: string;

  @Prop()
  reference?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Coords, required: true })
  coords: Coords;

  @Prop({ required: true })
  address: string;

  @Prop()
  name?: string;

  @Prop()
  sequence?: number;
}

@Schema({
  collection: 'optimized_routes',
  timestamps: true,
})
export class OptimizedRoute {
  @Prop({ required: true, index: true })
  shipping_list_id: string;

  @Prop({ required: true, index: true })
  parent_id: string;

  @Prop({ type: [RoutePoint], default: [] })
  route: RoutePoint[];

  @Prop({ required: true })
  total_distance: number;

  @Prop({ required: true })
  total_duration: number;

  @Prop({ required: true })
  strategy: string;

  @Prop({ type: Object })
  metadata?: any;

  @Prop({ type: Object })
  start_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

const OptimizedRouteSchema = SchemaFactory.createForClass(OptimizedRoute);

OptimizedRouteSchema.index({ shipping_list_id: 1, parent_id: 1 }, { unique: true });

export { OptimizedRouteSchema };

