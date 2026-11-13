
import { describe, expect, it, vi } from 'vitest';

import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('TC12: Chuyển JWT payload thành req.user', () => {
    const config = {
      getOrThrow: vi.fn().mockReturnValue(
        'test-secret-strong-enough',
      ),
    };

    const strategy = new JwtStrategy(
      config as unknown as ConfigService,
    );

    expect(config.getOrThrow).toHaveBeenCalledWith(
      'JWT_SECRET',
    );

    const result = strategy.validate({
      sub: 'uuid-23',
      email: 'test@brewlite.com',
    });

    expect(result).toEqual({
      userId: 'uuid-23',
      email: 'test@brewlite.com',
    });
  });
});