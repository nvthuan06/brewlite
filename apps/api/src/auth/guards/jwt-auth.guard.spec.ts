
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  it('TC13: Sử dụng Passport AuthGuard JWT', () => {
    const guard = new JwtAuthGuard();

    expect(guard).toHaveProperty('canActivate');

    expect(typeof guard.canActivate).toBe('function');
  });
});