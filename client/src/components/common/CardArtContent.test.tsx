
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardArtContent } from './CardArtContent';
import * as uploadLibrary from '@/helpers/uploadLibrary';
import { useUserPreferencesStore } from '@/store';

// Mock dependencies
vi.mock('@/helpers/uploadLibrary');
vi.mock('@/store');
vi.mock('./CardImageSvg', () => ({
    CardImageSvg: ({ url }: { url: string }) => <img src={url} alt="" />,
}));
vi.mock('@/hooks/useScryfallSearch', () => ({
    useScryfallSearch: () => ({ cards: [], hasResults: false })
}));
vi.mock('@/hooks/useScryfallPrints', () => ({
    useScryfallPrints: ({ initialPrints }: { initialPrints?: unknown[] }) => ({
        prints: initialPrints ?? [],
        isLoading: false,
        hasSearched: true,
    })
}));
vi.mock('@/hooks/useMpcSearch', () => ({
    useMpcSearch: () => ({ cards: [], filteredCards: [], filters: { sourceFilters: new Set(), tagFilters: new Set() } })
}));

vi.mock('@/helpers/scryfallApi', () => ({
    getCardByName: vi.fn(),
    fetchScryfallSets: vi.fn().mockResolvedValue([]),
}));
import { getCardByName } from '@/helpers/scryfallApi';

// Mock filteredUploadLibraryItems since it's used inside the component logic via useMemo which calls filterUploadLibraryItems
// Actually we can use the real implementation of filterCustomUploads if we don't mock it, but we mocked the whole module.
// So we need to provide implementation for filterUploadLibraryItems.
const mockUploads = [
    { hash: '1', displayName: 'Card A', imageUrl: 'url1', typeLine: 'Creature', isFavorite: false, createdAt: 1000 },
    { hash: '2', displayName: 'Card B', imageUrl: 'url2', typeLine: 'Instant', isFavorite: true, createdAt: 2000 },
];

describe('CardArtContent Upload Library Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useUserPreferencesStore as any).mockImplementation((selector: any) => selector({
            preferences: {}
        }));
        (uploadLibrary.getUploadLibraryItems as any).mockResolvedValue(mockUploads);
        (uploadLibrary.filterUploadLibraryItems as any).mockImplementation((uploads: any[], filters: any) => {
            return uploads.filter(u => {
                if (filters.query && !u.displayName.toLowerCase().includes(filters.query.toLowerCase())) return false;
                if (filters.isFavoriteOnly && !u.isFavorite) return false;
                return true;
            });
        });
        (uploadLibrary.sortUploadLibraryItems as any).mockImplementation((uploads: any[]) => uploads);
        (uploadLibrary.getFlexibleCardTypes as any).mockImplementation((typeLine: string) => typeLine ? [typeLine] : []);
        (uploadLibrary.getEffectiveCardTypes as any).mockImplementation((item: any) => item.typeLine ? [item.typeLine] : []);

    });

    it('shows all uploads when query matches', async () => {
        render(<CardArtContent artSource="upload-library" query="Card" onSelectCard={vi.fn()} />);
        await waitFor(() => expect(screen.getAllByTestId('upload-library-item')).toHaveLength(2));
    });

    it('filters uploads based on query', async () => {
        render(<CardArtContent artSource="upload-library" query="Card A" onSelectCard={vi.fn()} />);
        await waitFor(() => expect(screen.getAllByTestId('upload-library-item')).toHaveLength(1));
        expect(screen.getByText('Card A')).toBeInTheDocument();
        expect(screen.queryByText('Card B')).not.toBeInTheDocument();
    });

    it('shows "No uploads match" message when query has no results', async () => {
        render(<CardArtContent artSource="upload-library" query="NonExistent" onSelectCard={vi.fn()} />);

        await waitFor(() => expect(screen.queryByTestId('upload-library-item')).not.toBeInTheDocument());

        // Check message
        expect(screen.getByText(/No uploads match "NonExistent"/)).toBeInTheDocument();
    });


    it('allows linking an upload to a Scryfall card', async () => {
        const mockCard = { name: 'Sol Ring', set: 'lea', number: '270', type_line: 'Artifact' };
        (getCardByName as any).mockResolvedValue(mockCard);

        render(<CardArtContent artSource="upload-library" query="Card A" onSelectCard={vi.fn()} />);

        // Wait for items to load
        await waitFor(() => expect(screen.getByText('Card A')).toBeInTheDocument());

        // Find and click the Identify button (title="Identify card")
        const linkBtn = screen.getByTitle('Identify card');
        fireEvent.click(linkBtn);

        // Input should appear
        const input = screen.getByPlaceholderText('Search Scryfall...');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('Card A'); // Pre-filled with display name

        // Change input and submit
        fireEvent.change(input, { target: { value: 'Sol Ring' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        // Verify API call and metadata update
        await waitFor(() => expect(getCardByName).toHaveBeenCalledWith('Sol Ring'));

        expect(uploadLibrary.updateUploadLibraryMetadata).toHaveBeenCalledWith('1', {
            displayName: 'Sol Ring',
            canonicalCardName: 'Sol Ring',
            canonicalCardSet: 'lea',
            canonicalCardNumber: '270',
            typeLine: 'Artifact'
        });
    });
});

describe('CardArtContent favorite printings', () => {
    it('sorts a favorite printing first and allows removing it without selecting the card', () => {
        const toggleFavoritePrinting = vi.fn();
        const onSelectCard = vi.fn();
        const favorite = {
            imageUrl: 'https://cards.example/favorite.jpg',
            set: 'fav',
            number: '2',
        };
        (useUserPreferencesStore as any).mockImplementation((selector: any) => selector({
            preferences: {
                favoritePrintings: { 'sol ring': [favorite] },
                favoriteScryfallSets: [],
            },
            toggleFavoritePrinting,
            toggleFavoriteScryfallSet: vi.fn(),
        }));

        render(
            <CardArtContent
                artSource="scryfall"
                mode="prints"
                query="Sol Ring"
                initialPrints={[
                    { imageUrl: 'https://cards.example/other.jpg', set: 'oth', number: '1' },
                    favorite,
                ]}
                onSelectCard={onSelectCard}
            />
        );

        const cards = screen.getAllByTestId('artwork-card');
        expect(cards[0].querySelector('[title="Remove favorite printing"]')).toBeTruthy();

        fireEvent.click(screen.getByTitle('Remove favorite printing'));
        expect(toggleFavoritePrinting).toHaveBeenCalledWith('Sol Ring', favorite);
        expect(onSelectCard).not.toHaveBeenCalled();
    });
});
