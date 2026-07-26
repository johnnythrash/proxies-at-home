import { Layers3 } from "lucide-react";
import type { CardOption } from "../../../../shared/types";
import { ManaIcon } from "../common";

interface ArtworkDetailsPanelProps {
    card: CardOption;
    imageUrl?: string | null;
    displayName?: string;
}

function ManaCost({ value }: { value?: string }) {
    const symbols = value?.match(/\{([^}]+)\}/g)?.map((symbol) => symbol.slice(1, -1)) ?? [];

    if (symbols.length === 0) return null;

    return (
        <div className="flex items-center gap-0.5" aria-label={`Mana cost ${value}`}>
            {symbols.map((symbol, index) => (
                <ManaIcon key={`${symbol}-${index}`} symbol={symbol} size={20} />
            ))}
        </div>
    );
}

export function ArtworkDetailsPanel({
    card,
    imageUrl,
    displayName,
}: ArtworkDetailsPanelProps) {
    const setLabel = card.set?.toUpperCase();

    return (
        <aside className="hidden lg:flex w-[40%] max-w-[500px] min-w-[330px] flex-none flex-col overflow-y-auto border-r border-gray-200 bg-white px-6 py-6 dark:border-gray-600 dark:bg-gray-800">
            <div className="mx-auto w-full max-w-[258px]">
                <div className="aspect-[63/88] overflow-hidden rounded-[10px] bg-gray-100 shadow-lg ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/10">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={displayName || card.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                            Card preview unavailable
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="truncate text-2xl font-bold text-gray-900 dark:text-white">
                        {displayName || card.name}
                    </h3>
                    {card.type_line && (
                        <p className="mt-1 text-base text-gray-600 dark:text-gray-300">
                            {card.type_line}
                        </p>
                    )}
                </div>
                <ManaCost value={card.mana_cost} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                    <Layers3 className="size-4" />
                    {card.category || "Mainboard"}
                </span>
                {(setLabel || card.number) && (
                    <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        {[setLabel, card.number && `#${card.number}`].filter(Boolean).join(" ")}
                    </span>
                )}
            </div>

            <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Card details
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                    {card.rarity && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Rarity</dt>
                            <dd className="text-right capitalize text-gray-900 dark:text-white">{card.rarity}</dd>
                        </>
                    )}
                    {card.cmc !== undefined && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Mana value</dt>
                            <dd className="text-right text-gray-900 dark:text-white">{card.cmc}</dd>
                        </>
                    )}
                    {card.lang && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Language</dt>
                            <dd className="text-right uppercase text-gray-900 dark:text-white">{card.lang}</dd>
                        </>
                    )}
                </dl>
            </div>
        </aside>
    );
}
