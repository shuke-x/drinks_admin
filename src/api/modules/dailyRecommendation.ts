import { normCocktail } from '../normalize';
import { request } from '../request';
import type { LegacyDto } from '../types';

export const dailyRecommendationApi = {
  async get(date: string) {
    const raw = await request.get(`/admin/daily-recommendations/${date}`) || {};
    return {
      date: raw.date || date,
      items: (raw.items || []).map((item: LegacyDto) => ({
        ...item,
        cocktail: normCocktail(item.cocktail || {}),
      })),
    };
  },

  replace: (date: string, cocktailIds: string[]) => request.put(
    `/admin/daily-recommendations/${date}`,
    { cocktailIds },
  ),
};
