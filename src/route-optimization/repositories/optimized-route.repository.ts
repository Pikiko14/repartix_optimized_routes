import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import {
  OptimizedRoute,
  OptimizedRouteDocument,
} from '../schemas/optimized-route.schema';

@Injectable()
export class OptimizedRouteRepository {
  constructor(
    @InjectModel(OptimizedRoute.name)
    private readonly model: Model<OptimizedRouteDocument>,
  ) {}

  async create(routeData: Partial<OptimizedRoute>): Promise<OptimizedRouteDocument> {
    try {
      return await this.model.create(routeData);
    } catch (error) {
      throw new Error('Error creating optimized route');
    }
  }

  async findByShippingListId(
    shippingListId: string,
    parentId: string,
  ): Promise<OptimizedRouteDocument | null> {
    try {
      return await this.model.findOne({
        shipping_list_id: shippingListId,
        parent_id: parentId,
      });
    } catch (error) {
      throw new Error('Error finding optimized route');
    }
  }

  async update(
    shippingListId: string,
    parentId: string,
    routeData: Partial<OptimizedRoute>,
  ): Promise<OptimizedRouteDocument | null> {
    try {
      return await this.model.findOneAndUpdate(
        {
          shipping_list_id: shippingListId,
          parent_id: parentId,
        },
        routeData,
        { new: true },
      );
    } catch (error) {
      throw new Error('Error updating optimized route');
    }
  }

  async delete(
    shippingListId: string,
    parentId: string,
  ): Promise<OptimizedRouteDocument | null> {
    try {
      return await this.model.findOneAndDelete({
        shipping_list_id: shippingListId,
        parent_id: parentId,
      });
    } catch (error) {
      throw new Error('Error deleting optimized route');
    }
  }
}

