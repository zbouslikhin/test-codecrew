/** Compact numeric formatting for engineering read-outs (∞ for non-finite values). */
export const formatNumber = (value: number | undefined, digits = 3): string => {
	if (value === undefined || Number.isNaN(value)) {
		return '–';
	}
	if (!Number.isFinite(value)) {
		return value > 0 ? '∞' : '−∞';
	}
	const magnitude = Math.abs(value);
	if (magnitude !== 0 && (magnitude < 10 ** -digits || magnitude >= 1e6)) {
		return value.toExponential(2);
	}
	const fixed = value.toFixed(digits);
	// Avoid "-0.000".
	return Number(fixed) === 0 ? (0).toFixed(digits) : fixed;
};
