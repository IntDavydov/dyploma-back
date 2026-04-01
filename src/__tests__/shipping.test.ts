import { describe, it, expect } from 'vitest';
import { getShippingRate } from '../services/shippingService.js';

describe('Shipping Service', () => {
  it('should calculate higher rates for non-local destinations', () => {
    const localRate = getShippingRate(10, 'local');
    const globalRate = getShippingRate(10, 'global');
    
    expect(globalRate).toBeGreaterThan(localRate);
  });

  it('should include weight in the calculation', () => {
    const lightWeight = getShippingRate(1, 'local');
    const heavyWeight = getShippingRate(100, 'local');
    
    expect(heavyWeight).toBeGreaterThan(lightWeight);
  });

  it('should return a number', () => {
    const rate = getShippingRate(5, 'anywhere');
    expect(typeof rate).toBe('number');
  });
});
