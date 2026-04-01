/**
 * Service B: Mock External Shipping Rate Service
 * Simulates an external API for global shipping rates.
 */
export const getShippingRate = (weight: number, destination: string): number => {
  // Simple random logic as requested by todos.md
  const baseRate = 10;
  const destinationMultiplier = destination === 'local' ? 1 : 2.5;
  const randomFactor = Math.random() * 5;
  
  return parseFloat((baseRate * destinationMultiplier + weight * 0.5 + randomFactor).toFixed(2));
};
