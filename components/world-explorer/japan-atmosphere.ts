/** The golden-hour look of the Japan level (SRS-631.2): warm low sunlight, a
 * peach horizon under a soft blue zenith, and pale haze that lightens each
 * farther layer so the playable route stands out from the valley behind it.
 * Colours only; geometry, collisions and the course are untouched. */
export const japanAtmosphere={
 sky:{zenith:'#6ea5e2',horizon:'#fbe2c6',glow:[.34,.19,.06] as const,glowFocus:34},
 background:'#f4dcc3',
 /** Linear haze. Gameplay keeps the route clear and fades the far valley. */
 fog:{color:'#efdcc7',near:24,far:185,overviewNear:135,overviewFar:370},
 light:{exposure:1.06,sun:'#ffd49c',sunIntensity:3.5,sky:'#fff0dc',ground:'#7f8a58',hemisphere:1.25,rim:'#ffc6d4',rimIntensity:.6},
 /** The valley lake reads as bright misty water far below, not a teal floor. */
 lake:{deep:[.33,.51,.56] as const,pale:[.71,.80,.78] as const,sparkle:[.17,.15,.10] as const},
} as const;
