/**
 * Returns the path to an ingredient image file served from the public/ingredients/ directory.
 * Spaces in the ingredient name are replaced with underscores.
 */
export function getIngredientImagePath(name: string): string {
  return `${import.meta.env.BASE_URL}ingredients/${name.replace(/ /g, '_')}_icon.png`
}
