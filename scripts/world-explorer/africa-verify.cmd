@echo off
rem Africa verification on Windows. Double-click to run; logs go to tmp\africa-verify\.
rem  1. full test suite            -> tests.log
rem     Africa and shared world-explorer tests, run on their own   -> africa-tests.log
rem  2. production build with type-checking (next build; review distDir .next-review,
rem     so a running dev server's .next is not touched)          -> build.log
rem  3. record playthrough scripts for the 54 African levels      -> record.log
rem  4. start the built app on port 3117, probe the WebGL renderer -> gpu-probe.json
rem     landmark-card photo for each African country, as the running app selects it -> photo-audit.json
rem  5. capture the review gallery (7 views per level, hardware WebGL) -> capture.log
rem     images: documentation\world-explorer\review\africa\gallery
rem  6. replay every level in headless Edge (hardware WebGL)        -> playthrough.log
rem     results and screenshots: documentation\world-explorer\review\africa\playthroughs
rem The playthrough step takes a few hours. Close this window to stop at any point.
setlocal
cd /d "%~dp0..\.."
if not exist tmp\africa-verify mkdir tmp\africa-verify
set LOG=tmp\africa-verify\status.txt
echo Started %date% %time% > %LOG%
node -v >> %LOG%

call npx vitest run --reporter=verbose > tmp\africa-verify\tests.log 2>&1
echo tests exit %errorlevel% %date% %time% >> %LOG%

call npx vitest run --reporter=verbose __tests__/world-explorer-africa.test.ts __tests__/world-explorer-photo-filter.test.ts __tests__/world-explorer-media.test.ts __tests__/world-explorer-guide-destination.test.ts __tests__/world-explorer-level-design.test.ts __tests__/world-explorer-profiles.test.ts __tests__/world-explorer-districts.test.ts __tests__/world-explorer-country-environments.test.ts > tmp\africa-verify\africa-tests.log 2>&1
echo africa tests exit %errorlevel% %date% %time% >> %LOG%

set SOCIALU_BUILD_TARGET=review
call npm run build > tmp\africa-verify\build.log 2>&1
echo build exit %errorlevel% %date% %time% >> %LOG%

set PLAY_CODES=EGY,ZAF,MAR,DZA,TUN,LBY,SDN,MLI,NER,MRT,SEN,GMB,GNB,GIN,SLE,LBR,CIV,GHA,TGO,BEN,BFA,NGA,CPV,CMR,CAF,TCD,COD,COG,GAB,GNQ,STP,AGO,KEN,TZA,ETH,ERI,DJI,SOM,SSD,UGA,RWA,BDI,MWI,MOZ,MDG,MUS,SYC,COM,ZMB,ZWE,NAM,BWA,LSO,SWZ
set PLAY_OUT=documentation/world-explorer/review/africa/playthroughs
call npx vitest run --config scripts/world-explorer/playthrough.vitest.config.mjs > tmp\africa-verify\record.log 2>&1
echo record exit %errorlevel% %date% %time% >> %LOG%

if not exist .next-review\BUILD_ID (echo no review build, skipping replays >> %LOG% & goto end)
start "africa-review-server" /min cmd /c "set SOCIALU_BUILD_TARGET=review&& npx next start -p 3117 > tmp\africa-verify\server.log 2>&1"
node -e "(async()=>{for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:3117/world-explorer');if(r.ok)process.exit(0)}catch{}await new Promise(r=>setTimeout(r,2000))}process.exit(1)})()"
echo server ready exit %errorlevel% %date% %time% >> %LOG%
node --experimental-websocket scripts/world-explorer/africa-gpu-probe.mjs --base http://127.0.0.1:3117 --out tmp/africa-verify/gpu-probe.json >> %LOG% 2>&1
node scripts/world-explorer/africa-photo-audit.mjs --base http://127.0.0.1:3117 --out tmp/africa-verify/photo-audit.json > tmp\africa-verify\photo-audit.log 2>&1
echo photo audit exit %errorlevel% %date% %time% >> %LOG%
node scripts/world-explorer/africa-capture.cjs --base http://127.0.0.1:3117 > tmp\africa-verify\capture.log 2>&1
echo capture exit %errorlevel% %date% %time% >> %LOG%
node --experimental-websocket scripts/world-explorer/playthrough.mjs --codes %PLAY_CODES% --base http://127.0.0.1:3117 --out %PLAY_OUT% > tmp\africa-verify\playthrough.log 2>&1
echo playthrough exit %errorlevel% %date% %time% >> %LOG%
taskkill /FI "WINDOWTITLE eq africa-review-server*" /T /F >nul 2>&1

:end
echo Finished %date% %time% >> %LOG%
echo.
echo Done. Claude reads the results from tmp\africa-verify and the review folder.
pause
