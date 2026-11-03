@echo off
rem Clean re-run of the full test suite into tmp\africa-verify\tests-rerun.log, then each
rem file that failed in the first run on its own (no parallel load) into isolated-*.log.
setlocal EnableDelayedExpansion
cd /d "%~dp0..\.."
if not exist tmp\africa-verify mkdir tmp\africa-verify
echo tests rerun started %date% %time% >> tmp\africa-verify\status.txt
call npx vitest run --reporter=verbose > tmp\africa-verify\tests-rerun.log 2>&1
echo tests rerun exit %errorlevel% %date% %time% >> tmp\africa-verify\status.txt
for %%F in (world-explorer-country-environments world-explorer-level-design world-explorer-asia-enhancement world-explorer-west-asia) do (
  call npx vitest run --reporter=verbose __tests__/%%F.test.ts > tmp\africa-verify\isolated-%%F.log 2>&1
  echo isolated %%F exit !errorlevel! %date% %time% >> tmp\africa-verify\status.txt
)
