// Colour constants shared by the 3D models and the DOM panels. Kept free of Three.js so panels can
// import them without pulling the renderer into the page bundle (Three loads lazily).
export const PALETTE = {
  sage: '#76ad91', sageDeep: '#4b8075', cream: '#f7ead6', creamDeep: '#e6d5b8', oak: '#bb8351', oakDark: '#8d593d',
  navy: '#334b6a', navyDeep: '#223249', brass: '#e4b859', ink: '#242d3a', white: '#fff6e7', leaf: '#478d65', terracotta: '#c67354',
};
export const WALL_COLORS: Record<string, string> = { 'wall-sage': '#a4c3ab', 'wall-sky': '#a7cfe3', 'wall-cream': '#f5e2be' };
export const FLOOR_SWATCHES: Record<string, string> = { 'floor-oak': '#cb9367', 'floor-tile': '#eee2d0', 'floor-carpet': '#809a9d' };
