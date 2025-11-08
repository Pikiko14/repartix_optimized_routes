# Route Optimization Microservice

Microservicio para generar rutas óptimas de entrega basado en coordenadas de remitentes y clientes.

## Estrategias de Optimización

### 1. Google Maps
Utiliza la API de Google Maps Directions para obtener rutas optimizadas con datos reales de tráfico y distancias.

**Requisitos:**
- Variable de entorno `GOOGLE_MAPS_API_KEY` configurada

### 2. Haversine
Utiliza el algoritmo de distancia Haversine combinado con Nearest Neighbor y 2-opt para optimizar rutas sin dependencias externas.

## Uso

El microservicio expone el patrón NATS `optimize-route` que acepta:

- `shipping_list_id`: ID de la lista de envío a optimizar
- `order_ids`: Array de IDs de órdenes a optimizar
- `strategy`: Estrategia a usar (`google_maps` o `haversine`)
- `start_location`: Punto de inicio opcional con coordenadas
- `parent_id`: ID del padre (requerido)

