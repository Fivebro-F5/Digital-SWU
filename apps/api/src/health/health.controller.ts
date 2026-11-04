import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@digital-swu/contracts';

@Controller('api/health')
export class HealthController {
  @Get()
  getHealth(): HealthStatus {
    return { status: 'ok', service: 'api' };
  }
}
