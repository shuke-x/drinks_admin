import { normCocktail } from '../normalize';
import { request } from '../request';

export const dailyRecommendationApi = {
  async get(date) {
    const raw = await request.get(`/admin/daily-recommendations/${date}`) || {};
    return {
      date: raw.date || date,
      items: (raw.items || []).map((item) => ({
        ...item,
        cocktail: normCocktail(item.cocktail || {}),
      })),
    };
  },

  replace: (date, cocktailIds) => request.put(
    `/admin/daily-recommendations/${date}`,
    { cocktailIds },
  ),
};
