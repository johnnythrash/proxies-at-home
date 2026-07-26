import { useRef, useCallback, useState } from "react";
import { ImportOrchestrator } from "@/helpers/ImportOrchestrator";
import type { ImportIntent } from "@/helpers/importParsers";
import { useToastStore } from "@/store/toast";
import { handleAutoImportTokens } from "@/helpers/tokenImportHelper";
import { db } from "@/db";
import { useProjectStore } from "@/store/projectStore";

export type ImportPhase = "idle" | "looking-up" | "downloading" | "complete" | "error";

export interface ImportSummary {
    requested: number;
    matched: number;
    failed: number;
    failedNames: string[];
}

interface UseCardImportOptions {
    /**
     * Called when the import process completes successfully.
     */
    onComplete?: () => void;
}

export interface UseCardImportReturn {
    /**
     * Process an array of import intents.
     * Handles AbortController management, error handling, and auto-token import.
     */
    processCards: (intents: ImportIntent[]) => Promise<void>;
    /**
     * Cancel any active import operation.
     */
    cancel: () => void;
    phase: ImportPhase;
    progress: number;
    summary: ImportSummary | null;
    retryFailed: () => Promise<void>;
}

/**
 * Shared hook for processing card import intents.
 * Extracts common logic from DecklistUploader and DeckBuilderImporter.
 *
 * Features:
 * - AbortController management for cancellation
 * - Generation tracking for stale request handling
 * - Consistent error handling with toast notifications
 * - Auto-import tokens when enabled
 */
export function useCardImport(options: UseCardImportOptions = {}): UseCardImportReturn {
    const fetchController = useRef<AbortController | null>(null);
    const fetchGenerationRef = useRef(0);
    // Use ref for onComplete to avoid stale closure issues
    const onCompleteRef = useRef(options.onComplete);
    const lastIntentsRef = useRef<ImportIntent[]>([]);
    const [phase, setPhase] = useState<ImportPhase>("idle");
    const [progress, setProgress] = useState(0);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    onCompleteRef.current = options.onComplete;

    const processCards = useCallback(async (intents: ImportIntent[]) => {
        const currentGeneration = ++fetchGenerationRef.current;

        // Cancel any existing operation
        if (fetchController.current) {
            fetchController.current.abort();
        }
        fetchController.current = new AbortController();

        if (intents.length === 0) {
            useToastStore.getState().showErrorToast("No valid cards found to import. Please check your input.");
            return;
        }

        lastIntentsRef.current = intents;
        setPhase("looking-up");
        setProgress(0);
        setSummary(null);

        try {
            await ImportOrchestrator.process(intents, {
                signal: fetchController.current.signal,
                onProgress: (processed, total) => {
                    setPhase(processed === 0 ? "looking-up" : "downloading");
                    setProgress(total > 0 ? Math.round((processed / total) * 100) : 0);
                },
                onComplete: () => {
                    // Use ref to get latest callback
                    onCompleteRef.current?.();

                    // Auto-import tokens (helper checks setting internally)
                    void handleAutoImportTokens({ silent: true });
                }
            });

            const requested = intents.reduce((total, intent) => total + (intent.quantity ?? 1), 0);
            let failedCards: Awaited<ReturnType<typeof db.cards.toArray>> = [];
            try {
                const projectId = useProjectStore.getState().currentProjectId;
                const importedNames = new Set(intents.map((intent) => intent.name.toLowerCase()));
                failedCards = projectId
                    ? (await db.cards.where("projectId").equals(projectId).toArray())
                        .filter((card) => importedNames.has(card.name.toLowerCase()) && !!card.lookupError)
                    : [];
            } catch {
                // The import itself succeeded. A summary lookup should never
                // turn that success into an error state.
            }
            const failedNames = [...new Set(failedCards.map((card) => card.name))];
            setSummary({
                requested,
                matched: Math.max(0, requested - failedCards.length),
                failed: failedCards.length,
                failedNames,
            });
            setPhase("complete");
            setProgress(100);
        } catch (err: unknown) {
            // Ignore errors from stale fetches
            if (currentGeneration !== fetchGenerationRef.current) return;

            if (err instanceof Error && err.name !== "AbortError") {
                setPhase("error");
                useToastStore.getState().showErrorToast(err.message || "Something went wrong while fetching cards.");
            } else if (err instanceof Error) {
                setPhase("idle");
            } else if (!(err instanceof Error)) {
                useToastStore.getState().showErrorToast("An unknown error occurred while fetching cards.");
            }
        } finally {
            // Only clear if this is still the active generation
            if (currentGeneration === fetchGenerationRef.current) {
                fetchController.current = null;
            }
        }
    }, []); // No dependencies - uses refs for callbacks

    const cancel = useCallback(() => {
        fetchController.current?.abort();
        fetchController.current = null;
        setPhase("idle");
    }, []);

    const retryFailed = useCallback(async () => {
        const failedNames = new Set(summary?.failedNames.map((name) => name.toLowerCase()) ?? []);
        const retryIntents = lastIntentsRef.current.filter((intent) =>
            failedNames.has(intent.name.toLowerCase())
        );
        if (retryIntents.length > 0) {
            await processCards(retryIntents);
        }
    }, [processCards, summary]);

    return { processCards, cancel, phase, progress, summary, retryFailed };
}
