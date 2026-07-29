import type { FavoritePrinting } from "@/db";
import type { ImportIntent } from "@/helpers/importParsers";

export function applyFavoritePrintingsToIntents(
    intents: ImportIntent[],
    favoritePrintings: Record<string, FavoritePrinting[]>,
): ImportIntent[] {
    return intents.map((intent) => {
        const favorite = favoritePrintings[intent.name.trim().toLowerCase()]?.[0];
        const favoriteSource = favorite?.source ?? "scryfall";
        const hasExplicitPrinting =
            !!intent.set || !!intent.number || !!intent.preferredImageId ||
            !!intent.imageUrl || !!intent.localImageId || !!intent.mpcId ||
            !!intent.preloadedData;
        const sourceMismatch =
            (intent.sourcePreference === "scryfall" && favoriteSource !== "scryfall") ||
            (intent.sourcePreference === "mpc" && favoriteSource !== "mpc") ||
            intent.sourcePreference === "manual" ||
            intent.sourcePreference === "upload-library";

        if (!favorite || hasExplicitPrinting || sourceMismatch) return intent;
        if (favorite.source === "mpc" && favorite.identifier) {
            return { ...intent, mpcId: favorite.identifier, sourcePreference: "mpc" };
        }
        if (favorite.source === "upload-library" && favorite.localImageId) {
            return {
                ...intent,
                localImageId: favorite.localImageId,
                sourcePreference: "upload-library",
            };
        }
        if (favorite.imageUrl && favorite.set && favorite.number) {
            return {
                ...intent,
                set: favorite.set,
                number: favorite.number,
                preferredImageId: favorite.imageUrl,
            };
        }
        return intent;
    });
}
