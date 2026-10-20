import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['scripts/tests/dormspace-multiplayer.browser.ts'],testTimeout:120000,hookTimeout:90000,fileParallelism:false,bail:1,reporters:['verbose']}});
