import { describe, expect, it } from "vitest";
import { applyFavoritePrintingsToIntents } from "./favoritePrintings";

const baseIntent = {
    name: "Sol Ring",
    quantity: 1,
    isToken: false,
};

describe("applyFavoritePrintingsToIntents", () => {
    const favorites = {
        "sol ring": [{
            imageUrl: "https://cards.example/lea-270.jpg",
            set: "lea",
            number: "270",
        }],
    };

    it("uses the newest favorite for a plain import", () => {
        expect(applyFavoritePrintingsToIntents([baseIntent], favorites)).toEqual([{
            ...baseIntent,
            set: "lea",
            number: "270",
            preferredImageId: "https://cards.example/lea-270.jpg",
        }]);
    });

    it("does not override an explicitly requested printing", () => {
        const explicit = { ...baseIntent, set: "cmm", number: "396" };
        expect(applyFavoritePrintingsToIntents([explicit], favorites)).toEqual([explicit]);
    });

    it("does not apply a Scryfall favorite to MPC imports", () => {
        const mpc = { ...baseIntent, sourcePreference: "mpc" as const };
        expect(applyFavoritePrintingsToIntents([mpc], favorites)).toEqual([mpc]);
    });

    it("uses a favorite MPC artwork for MPC imports", () => {
        const mpc = { ...baseIntent, sourcePreference: "mpc" as const };
        expect(applyFavoritePrintingsToIntents([mpc], {
            "sol ring": [{ source: "mpc", identifier: "mpc-123" }],
        })).toEqual([{
            ...mpc,
            mpcId: "mpc-123",
        }]);
    });

    it("can restore a favorite uploaded image when the import uses that source", () => {
        const upload = { ...baseIntent };
        expect(applyFavoritePrintingsToIntents([upload], {
            "sol ring": [{ source: "upload-library", localImageId: "upload-hash" }],
        })).toEqual([{
            ...upload,
            localImageId: "upload-hash",
            sourcePreference: "upload-library",
        }]);
    });
});
