import { AbvBadge, Icon } from './ui';
import { BASE_SPIRITS, fmtNum } from '../utils';

const SPIRIT_TONE: Record<string, string> = {
  gin: 'green', rum: 'amber', whiskey: 'ochre',
  tequila: 'red', vodka: 'ice', brandy: 'red', other: 'violet',
};

type HotCocktail = {
  baseSpirit?: string;
  abv?: number | null;
  name: string;
  weeklyViews?: number | null;
  likes?: number | null;
};

type HotPosterProps = {
  cocktail: HotCocktail;
  rank: number;
};

/** Floating Liquid Glass card used by ImageTrail and any future cocktail showcase. */
export function HotPoster({ cocktail, rank }: HotPosterProps) {
  const tone = SPIRIT_TONE[cocktail.baseSpirit || ''] || 'violet';
  const spirit = cocktail.baseSpirit ? (BASE_SPIRITS[cocktail.baseSpirit] || cocktail.baseSpirit) : '其他';

  return (
    <div className={`poster poster--${tone}`}>
      <div className="poster__core">
        <span className="poster__rank">NO.{rank}</span>
        <span className="poster__spirit">{spirit}{cocktail.abv != null && <AbvBadge value={cocktail.abv} compact />}</span>
        <span className="poster__name">{cocktail.name}</span>
        {(cocktail.weeklyViews != null || cocktail.likes != null) && (
          <span className="poster__foot">
            {cocktail.weeklyViews != null && <><Icon name="eye" size={11} />{fmtNum(cocktail.weeklyViews)}</>}
            {cocktail.likes != null && <em>&hearts; {fmtNum(cocktail.likes)}</em>}
          </span>
        )}
      </div>
    </div>
  );
}
