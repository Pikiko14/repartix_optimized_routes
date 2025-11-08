import { IsString, IsOptional, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum OptimizationStrategy {
  GOOGLE_MAPS = 'google_maps',
  HAVERSINE = 'haversine',
}

export class OptimizeRouteDto {
  @IsString()
  @IsOptional()
  shipping_list_id?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  order_ids?: string[];

  @IsEnum(OptimizationStrategy)
  strategy: OptimizationStrategy;

  @IsString()
  parent_id: string;

  @IsOptional()
  @IsString()
  user_request_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  start_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

