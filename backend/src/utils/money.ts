export function formatCents(cents: number, currency: string): string {
  const amount = cents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency codes
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
