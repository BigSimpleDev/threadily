// One named category and its tiles, as authored. Authored order is the answer
// key; tiles are shuffled into the pool at runtime.
export interface category {
    name: string;
    tiles: string[];
}

// One puzzle: sort every tile into its named category.
export interface puzzle {
    // Global id, unique across every pack (pack n holds (n-1)*100+1 .. n*100).
    id: number;
    // Authored difficulty, 1–5 stars. Grid size sets the floor; wordplay raises it.
    rating: number;
    title?: string;
    categories: category[];
    // Deliberate dual-meaning tiles (author bookkeeping for the ambiguity pass).
    herrings?: string[];
    // Author note, never shown in the app.
    note?: string;
    // If set, the puzzle references a trademarked/private entity. Names the
    // rights-holder shown in the "no affiliation" disclaimer and triggers the
    // header info icon.
    warning?: string;
}

// One pack file under src/assets/puzzles/<n>.json.
export interface pack_data {
    pack: number;
    puzzles: puzzle[];
}

export type rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface trinket {
    id: string;
    name: string;
    rarity: rarity;
    set: string;
    img: string;
}
