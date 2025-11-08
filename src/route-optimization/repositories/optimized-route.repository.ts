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
      throw new Error(`Error creating optimized route: ${error.message || error}`);
    }
  }

  async findByShippingListId(
    shippingListId: string,
    parentId: string,
    routeType?: string,
  ): Promise<OptimizedRouteDocument | null> {
    try {
      const query: any = { shipping_list_id: shippingListId, parent_id: parentId };
      if (routeType) {
        query.route_type = routeType;
      }
      return await this.model.findOne(query);
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

  async findAll(
    parentId: string,
    page: number = 1,
    perPage: number = 10,
    search?: string,
    shippingListIds?: string[] | null,
    routeType?: string,
    shippingListId?: string,
  ): Promise<{ data: OptimizedRouteDocument[]; totalItems: number }> {
    try {
      const query: any = { parent_id: parentId };
      
      if (routeType && routeType !== 'all') {
        query.route_type = routeType;
      }

      if (shippingListId) {
        query.shipping_list_id = shippingListId;
      }
      
      if (search) {
        if (shippingListIds && shippingListIds.length > 0) {
          // Si tenemos IDs de shipping lists que coinciden con la búsqueda, los usamos
          if (!shippingListId) {
            query.shipping_list_id = { $in: shippingListIds };
          }
        } else {
          // Si no, buscamos por shipping_list_id directamente
          if (!shippingListId) {
            query.$or = [
              { shipping_list_id: { $regex: search, $options: 'i' } },
              { route_type: { $regex: search, $options: 'i' } },
              { strategy: { $regex: search, $options: 'i' } },
            ];
          }
        }
      }

      const skip = (page - 1) * perPage;
      const [data, totalItems] = await Promise.all([
        this.model.find(query).skip(skip).limit(perPage).sort({ createdAt: -1 }).exec(),
        this.model.countDocuments(query).exec(),
      ]);

      return { data, totalItems };
    } catch (error) {
      throw new Error('Error finding optimized routes');
    }
  }

  async deleteById(routeId: string, parentId: string): Promise<OptimizedRouteDocument | null> {
    try {
      return await this.model.findOneAndDelete({
        _id: routeId,
        parent_id: parentId,
      });
    } catch (error) {
      throw new Error('Error deleting optimized route');
    }
  }
}

