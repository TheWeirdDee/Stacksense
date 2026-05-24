export function toSTX(microSTX) {
    return Math.round(Number(microSTX) / 1_000_000);
}
export function formatSTX(amount) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
export function formatUSD(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}
