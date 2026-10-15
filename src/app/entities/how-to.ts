import { AD_HEARTS_GRANT, HINT_COST, STARTING_HEARTS } from './constants';

// Shared copy for the first-launch tutorial (on pack 1 #1) and Settings → How
// to play, so the two never drift apart.
export interface how_to_step {
    icon: string;
    title: string;
    body: string;
}

export const HOW_TO_STEPS: how_to_step[] = [
    {
        icon: '👆',
        title: 'Place tiles',
        body: 'Tap a tile, then tap a category to drop it in. Or tap a category first, then tap tiles. Tap a placed tile to send it back.'
    },
    {
        icon: '🔒',
        title: 'Lock In',
        body: 'When a category is full, tap Lock In. Right: it locks and fills with color. Wrong: the tiles come back.'
    },
    {
        icon: '🤏',
        title: 'One away…',
        body: 'If exactly one tile is wrong you\'ll see "One away…". Watch for tiles that look like they fit two categories — only one is right.'
    },
    {
        icon: '❤️',
        title: 'Hearts',
        body: `Each wrong Lock In costs a heart; you get ${STARTING_HEARTS}. Out of hearts? Watch an ad for +${AD_HEARTS_GRANT} and keep your board. Stuck? 💡 places a correct tile for ${HINT_COST} coins.`
    }
];
