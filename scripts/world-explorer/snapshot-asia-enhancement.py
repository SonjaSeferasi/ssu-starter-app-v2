"""Refresh a review-only copy; never edits the user's shared working tree."""
from pathlib import Path
import shutil,json,hashlib
root=Path(__file__).resolve().parents[2];out=root/'tmp/tools/asia-enhancement-candidate';out.mkdir(parents=True,exist_ok=True)
for folder in ['app','components','lib','__tests__','supabase','assets']:
 if (root/folder).exists():shutil.copytree(root/folder,out/folder,dirs_exist_ok=True)
if not (out/'public').exists():shutil.copytree(root/'public',out/'public')
for name in ['package.json','package-lock.json','next.config.js','next-env.d.ts','tsconfig.json','tailwind.config.js','postcss.config.js','vitest.config.ts','.env.local','.env']:
 if (root/name).exists():shutil.copy2(root/name,out/name)
config=json.loads((out/'tsconfig.json').read_text());config['include']=['next-env.d.ts','app/**/*.ts','app/**/*.tsx','components/**/*.ts','components/**/*.tsx','lib/**/*.ts','__tests__/**/*.ts','.next-asia-phase-a/types/**/*.ts'];config['exclude']=['node_modules','tmp','documentation'];(out/'tsconfig.json').write_text(json.dumps(config,indent=2)+'\n')
review=out/'documentation/world-explorer/review/asia/enhancement';review.mkdir(parents=True,exist_ok=True)
for p in (root/'documentation/world-explorer/review/asia/enhancement').glob('*.json'):shutil.copy2(p,review/p.name)
print('Review copy refreshed at',out.relative_to(root))
