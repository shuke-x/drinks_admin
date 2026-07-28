type AbvBadgeProps = {
  value: number;
  compact?: boolean;
};

/** High-visibility alcohol-by-volume indicator used wherever cocktail strength is shown. */
export function AbvBadge({ value, compact = false }: AbvBadgeProps) {
  return <span className={`abv-badge${compact ? ' abv-badge--compact' : ''}`}>{compact ? `${value}%` : `≈ ${value}% ABV`}</span>;
}
