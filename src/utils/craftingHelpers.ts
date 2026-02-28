/**
 * Returns the path to an ingredient image file served from the public/ingredients/ directory.
 * Spaces in the ingredient name are replaced with underscores.
 */
export function getIngredientImagePath(name: string): string {
  return `${import.meta.env.BASE_URL}ingredients/${name.replace(/ /g, '_')}_icon.png`
}

/** Fallback image path when a specific ingredient icon is unavailable. */
export function getIngredientFallbackPath(): string {
  return `${import.meta.env.BASE_URL}ingredients/Ingredient_Bag.png`
}
