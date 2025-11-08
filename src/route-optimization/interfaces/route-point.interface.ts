export interface RoutePoint {
  order_id?: string;
  reference?: string;
  type: 'sender' | 'client';
  coords: {
    lat: number;
    lng: number;
  };
  address: string;
  name?: string;
  sequence?: number;
}

export interface OptimizedRoute {
  route: RoutePoint[];
  total_distance: number;
  total_duration: number;
  strategy: string;
  metadata?: {
    distance_matrix?: any;
    directions?: any;
  };
}

