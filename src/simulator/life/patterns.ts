export type PatternCategory = "still-life" | "oscillator" | "spaceship" | "gun";

export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  period?: number;
  width: number;
  height: number;
  cells: ReadonlyArray<readonly [number, number]>;
}

export const PATTERNS: Pattern[] = [
  // ── Still lifes ─────────────────────────────────────────────────────────────
  {
    id: "block",
    name: "Block",
    category: "still-life",
    description: "The simplest still life. A 2×2 square of cells that never changes.",
    width: 2, height: 2,
    cells: [[0,0],[0,1],[1,0],[1,1]],
  },
  {
    id: "beehive",
    name: "Beehive",
    category: "still-life",
    description: "A 6-cell still life shaped like a honeycomb.",
    width: 4, height: 3,
    cells: [[0,1],[0,2],[1,0],[1,3],[2,1],[2,2]],
  },
  {
    id: "loaf",
    name: "Loaf",
    category: "still-life",
    description: "A 7-cell still life. Common in random soups.",
    width: 4, height: 4,
    cells: [[0,1],[0,2],[1,0],[1,3],[2,1],[2,3],[3,2]],
  },
  {
    id: "boat",
    name: "Boat",
    category: "still-life",
    description: "A 5-cell still life.",
    width: 3, height: 3,
    cells: [[0,0],[0,1],[1,0],[1,2],[2,1]],
  },

  // ── Oscillators ─────────────────────────────────────────────────────────────
  {
    id: "blinker",
    name: "Blinker",
    category: "oscillator",
    period: 2,
    description: "The smallest oscillator. Alternates between a horizontal and vertical bar.",
    width: 3, height: 1,
    cells: [[0,0],[0,1],[0,2]],
  },
  {
    id: "toad",
    name: "Toad",
    category: "oscillator",
    period: 2,
    description: "A period-2 oscillator made of two offset rows of three cells.",
    width: 4, height: 2,
    cells: [[0,1],[0,2],[0,3],[1,0],[1,1],[1,2]],
  },
  {
    id: "beacon",
    name: "Beacon",
    category: "oscillator",
    period: 2,
    description: "Two overlapping 2×2 blocks that blink at period 2.",
    width: 4, height: 4,
    cells: [[0,0],[0,1],[1,0],[1,1],[2,2],[2,3],[3,2],[3,3]],
  },
  {
    id: "pulsar",
    name: "Pulsar",
    category: "oscillator",
    period: 3,
    description: "A large period-3 oscillator with 12-fold rotational symmetry. 48 live cells.",
    width: 13, height: 13,
    cells: [
      [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
      [2,0],[2,5],[2,7],[2,12],
      [3,0],[3,5],[3,7],[3,12],
      [4,0],[4,5],[4,7],[4,12],
      [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
      [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
      [8,0],[8,5],[8,7],[8,12],
      [9,0],[9,5],[9,7],[9,12],
      [10,0],[10,5],[10,7],[10,12],
      [12,2],[12,3],[12,4],[12,8],[12,9],[12,10],
    ],
  },

  // ── Spaceships ──────────────────────────────────────────────────────────────
  {
    id: "glider",
    name: "Glider",
    category: "spaceship",
    period: 4,
    description: "The smallest spaceship. Travels diagonally one cell every 4 generations.",
    width: 3, height: 3,
    cells: [[0,1],[1,2],[2,0],[2,1],[2,2]],
  },
  {
    id: "lwss",
    name: "LWSS",
    category: "spaceship",
    period: 4,
    description: "Lightweight Spaceship. Travels horizontally one cell every 2 generations.",
    width: 5, height: 4,
    cells: [[0,1],[0,4],[1,0],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3]],
  },

  // ── Guns ────────────────────────────────────────────────────────────────────
  {
    id: "gosper-gun",
    name: "Gosper Glider Gun",
    category: "gun",
    period: 30,
    description: "The first pattern discovered to exhibit unbounded growth. Fires a glider every 30 generations.",
    width: 36, height: 9,
    cells: [
      [0,24],
      [1,22],[1,24],
      [2,12],[2,13],[2,20],[2,21],[2,34],[2,35],
      [3,11],[3,15],[3,20],[3,21],[3,34],[3,35],
      [4,0],[4,1],[4,10],[4,16],[4,20],[4,21],
      [5,0],[5,1],[5,10],[5,14],[5,16],[5,17],[5,22],[5,24],
      [6,10],[6,16],[6,24],
      [7,11],[7,15],
      [8,12],[8,13],
    ],
  },
];

export const PATTERN_BY_ID: Record<string, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p])
);

export const PATTERN_CATEGORIES: Record<PatternCategory, Pattern[]> = {
  "still-life": PATTERNS.filter((p) => p.category === "still-life"),
  "oscillator": PATTERNS.filter((p) => p.category === "oscillator"),
  "spaceship":  PATTERNS.filter((p) => p.category === "spaceship"),
  "gun":        PATTERNS.filter((p) => p.category === "gun"),
};

export const CATEGORY_LABELS: Record<PatternCategory, string> = {
  "still-life": "Still Lifes",
  "oscillator": "Oscillators",
  "spaceship":  "Spaceships",
  "gun":        "Guns",
};
