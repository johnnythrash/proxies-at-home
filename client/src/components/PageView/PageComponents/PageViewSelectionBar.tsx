import { CheckSquare, Eraser, XSquare } from "lucide-react";
import { useSelectionStore } from "@/store/selection";
import { usePageViewSettings } from "@/hooks/usePageViewSettings";
import { ImageSource, type CardOption } from "../../../../../shared/types";
import { useMemo } from "react";
import { db } from "@/db";
import { useToastStore } from "@/store/toast";

interface PageViewSelectionBarProps {
    cards: CardOption[];
    mobile?: boolean;
}

export function PageViewSelectionBar({ cards, mobile }: PageViewSelectionBarProps) {
    const selectedCards = useSelectionStore((state) => state.selectedCards);
    const selectAll = useSelectionStore((state) => state.selectAll);
    const clearSelection = useSelectionStore((state) => state.clearSelection);
    const hasSelection = selectedCards.size > 0;

    const {
        settingsPanelWidth,
        isSettingsPanelCollapsed,
        uploadPanelWidth,
        isUploadPanelCollapsed,
    } = usePageViewSettings();

    const allCardUuids = useMemo(() => cards.map(c => c.uuid), [cards]);
    const selectedScryfallCards = useMemo(
        () => cards.filter(card =>
            selectedCards.has(card.uuid) &&
            card.source === ImageSource.Scryfall &&
            !card.linkedFrontId
        ),
        [cards, selectedCards]
    );
    const allSelectedScryfallCardsHaveStampRemoval =
        selectedScryfallCards.length > 0 &&
        selectedScryfallCards.every(card => card.overrides?.removeRarityStamp === true);

    const toggleRarityStampRemoval = async () => {
        if (selectedScryfallCards.length === 0) {
            useToastStore.getState().addToast({
                message: "No selected Scryfall front cards",
                type: "error",
                dismissible: true,
            });
            return;
        }

        const enabled = !allSelectedScryfallCardsHaveStampRemoval;
        await db.cards.bulkUpdate(selectedScryfallCards.map(card => ({
            key: card.uuid,
            changes: {
                overrides: {
                    ...card.overrides,
                    removeRarityStamp: enabled,
                },
            },
        })));

        useToastStore.getState().addToast({
            message: enabled
                ? "Experimental stamp removal enabled for " + selectedScryfallCards.length + " card(s)"
                : "Original stamps restored for " + selectedScryfallCards.length + " card(s)",
            type: "success",
            dismissible: true,
        });
    };

    if (!hasSelection || !cards || cards.length === 0) {
        return null;
    }

    return (
        <div
            className={`fixed z-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg flex items-center ${mobile ? 'bottom-20 left-1/2 -translate-x-1/2 landscape:bottom-4 landscape:left-[calc(50%+48px)]' : 'bottom-6'}`}
            style={mobile ? undefined : {
                // On desktop, account for side panels for centering
                left: `calc(50% + ${((isUploadPanelCollapsed ? 60 : uploadPanelWidth) - (isSettingsPanelCollapsed ? 60 : settingsPanelWidth)) / 2}px)`,
                transform: 'translateX(-50%)'
            }}>
            <span className="px-3 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap border-r border-gray-300 dark:border-gray-600">
                {selectedCards.size} selected
            </span>
            <button
                onClick={() => selectAll(allCardUuids)}
                className="px-3 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-75 active:translate-y-[1px] flex items-center gap-2 border-r border-gray-300 dark:border-gray-600"
                title="Select All"
            >
                <CheckSquare className="size-4" />
                <span className="text-sm hidden sm:inline">Select All</span>
            </button>
            <button
                onClick={() => void toggleRarityStampRemoval()}
                disabled={selectedScryfallCards.length === 0}
                className="px-3 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-75 active:translate-y-[1px] flex items-center gap-2 border-r border-gray-300 dark:border-gray-600"
                title={selectedScryfallCards.length > 0 ? (allSelectedScryfallCardsHaveStampRemoval ? "Restore original rarity stamps" : "Remove rarity stamps") : "Select one or more Scryfall front cards"}
            >
                <Eraser className="size-4" />
                <span className="text-sm whitespace-nowrap">{allSelectedScryfallCardsHaveStampRemoval ? "Restore Stamps" : "Remove Stamps"}</span>
            </button>
            <button
                onClick={clearSelection}
                className="px-3 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-75 active:translate-y-[1px] flex items-center gap-2"
                title="Deselect All"
            >
                <XSquare className="size-4" />
                <span className="text-sm hidden sm:inline">Deselect</span>
            </button>
        </div>
    );
}
