import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockHealthResult = {
    status: 'ok',
    info: { database: { status: 'up' } },
    error: {},
    details: { database: { status: 'up' } },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            // Thực thi mảng các hàm indicator truyền vào hoặc trả về kết quả mẫu
            check: vi.fn(async (indicators: Array<() => Promise<any>>) => {
              for (const indicator of indicators) {
                await indicator();
              }
              return mockHealthResult;
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: vi.fn().mockResolvedValue({ database: { status: 'up' } } as never),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: vi.fn().mockResolvedValue({ memory_heap: { status: 'up' } } as never),
            checkRSS: vi.fn().mockResolvedValue({ memory_rss: { status: 'up' } } as never),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: vi.fn().mockResolvedValue({ storage: { status: 'up' } } as never),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('Health controller kiểm tra', () => {
    expect(controller).toBeDefined();
  });

  it('Nên trả về trạng thái ok khi hệ thống và database hoạt động bình thường', async () => {
    const result = await controller.check();

    expect(healthCheckService.check).toHaveBeenCalled();
    expect(result).toEqual(mockHealthResult);
  });
});