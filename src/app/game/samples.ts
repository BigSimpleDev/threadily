import { puzzle } from '../entities/entities';

// Hardcoded boards for the #2 layout test (pack 0 in the play route). One per
// grid size, plus two 5×4 boards with long tiles to stress the phone layout.
export const SAMPLE_PUZZLES: puzzle[] = [
    {
        id: -1, rating: 1, title: '2×4 · Breakfast or Bedtime',
        categories: [
            { name: 'Breakfast', tiles: ['Pancake', 'Waffle', 'Bacon', 'Toast'] },
            { name: 'Bedtime', tiles: ['Pillow', 'Lullaby', 'Blanket', 'Nightlight'] }
        ]
    },
    {
        id: -2, rating: 2, title: '3×4 · Nature Calls',
        categories: [
            { name: 'Trees', tiles: ['Oak', 'Maple', 'Birch', 'Cedar'] },
            { name: 'Birds', tiles: ['Robin', 'Finch', 'Swallow', 'Crane'] },
            { name: 'Flowers', tiles: ['Daisy', 'Tulip', 'Iris', 'Poppy'] }
        ]
    },
    {
        id: -3, rating: 3, title: '4×4 · Lone Star & Friends',
        categories: [
            { name: 'Texas', tiles: ['Austin', 'Alamo', 'Big Bend', 'Rangers'] },
            { name: 'Ohio', tiles: ['Columbus', 'Cedar Point', 'Cuyahoga', 'Browns'] },
            { name: 'Florida', tiles: ['Tampa', 'Everglades', 'Key West', 'Marlins'] },
            { name: 'Arizona', tiles: ['Phoenix', 'Sedona', 'Grand Canyon', 'Cardinals'] }
        ]
    },
    {
        id: -4, rating: 4, title: '5×4 · Road Trip',
        categories: [
            { name: 'Texas', tiles: ['San Antonio', 'El Paso', 'Big Bend', 'Astros'] },
            { name: 'Wyoming', tiles: ['Yellowstone', 'Cheyenne', 'Grand Teton', 'Laramie'] },
            { name: 'California', tiles: ['Sacramento', 'Yosemite', 'Death Valley', 'Dodgers'] },
            { name: 'Florida', tiles: ['Jacksonville', 'Everglades', 'Daytona', 'Marlins'] },
            { name: 'Colorado', tiles: ['Boulder', 'Aspen', 'Pikes Peak', 'Rockies'] }
        ]
    },
    {
        id: -5, rating: 5, title: '5×4 · Double Duty',
        categories: [
            { name: 'Card games', tiles: ['Hearts', 'Spades', 'Rummy', 'Solitaire'] },
            { name: 'Yoga poses', tiles: ['Cobra', 'Warrior', 'Tree', 'Downward Dog'] },
            { name: 'Golf terms', tiles: ['Eagle', 'Birdie', 'Bogey', 'Mulligan'] },
            { name: 'Snakes', tiles: ['Python', 'Viper', 'Mamba', 'Boa'] },
            { name: 'Tree parts', tiles: ['Trunk', 'Bark', 'Branch', 'Root'] }
        ]
    }
];
