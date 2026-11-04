export interface HealthStatus {
  status: 'ok';
  service: 'api';
}

export interface GeographicCoordinate {
  longitude: number;
  latitude: number;
}

export interface WorldCoordinate {
  x: number;
  y: number;
  sceneId: string;
}
