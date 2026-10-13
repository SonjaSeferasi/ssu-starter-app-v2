#!/bin/zsh
cd "$(dirname "$0")/.." || exit 1
python3 scripts/setup_supabase.py
printf '\nPress Enter to close this window.'
read -r
