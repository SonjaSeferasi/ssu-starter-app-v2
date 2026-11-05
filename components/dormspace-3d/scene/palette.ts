// Colour constants shared by the 3D models and the DOM panels. Kept free of Three.js so panels can
// import them without pulling the renderer into the page bundle (Three loads lazily).
export const PALETTE = {
  sage: '#9fb293', sageDeep: '#6f8a6a', cream: '#f1e8d6', creamDeep: '#e3d5bb', oak: '#b88a58', oakDark: '#8a6440',
  navy: '#2d3e5c', navyDeep: '#1f2c44', brass: '#c9a35e', ink: '#2a2f33', white: '#f6f3ec', leaf: '#4f7d4c', terracotta: '#b9714f',
};
export const WALL_COLORS: Record<string, string> = { 'wall-sage': '#b6c4a8', 'wall-sky': '#bcd1dc', 'wall-cream': '#ece2cb' };
export const FLOOR_SWATCHES: Record<string, string> = { 'floor-oak': '#c39462', 'floor-tile': '#ddd5c6', 'floor-carpet': '#93a39a' };
