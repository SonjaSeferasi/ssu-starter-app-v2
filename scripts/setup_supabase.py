#!/usr/bin/env python3
"""Configure local Supabase credentials without echoing them or changing Git state."""
from getpass import getpass
from pathlib import Path
from urllib.parse import urlparse
import os
import tempfile


def configure():
    root = Path(__file__).resolve().parent.parent
    target = root / '.env.local'
    lines = target.read_text().splitlines() if target.exists() else []
    existing = {}
    for line in lines:
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            existing[key.strip()] = value.strip().strip('\"\x27')
    default = existing.get('SUPABASE_URL') or 'https://sfrpokisjlwgknxlzllu.supabase.co'
    print('SocialU — connect your Supabase project')
    print('Copy keys from Settings → API Keys → Legacy anon, service_role keys.')
    print('Key input is hidden. Nothing you type here is sent to the chat.\n')
    url = input(f'Project URL [press Enter for {default}]: ').strip() or default
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.supabase.co') or parsed.path not in ('', '/') or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Use the project URL, such as https://your-project.supabase.co, without /rest/v1/.')
    anon = getpass('Paste anon key, then press Enter (hidden): ').strip()
    service = getpass('Paste service_role key, then press Enter (hidden): ').strip()
    for value, label in [(anon, 'anon'), (service, 'service_role')]:
        if len(value) < 30 or any(c.isspace() for c in value) or any(c in value for c in ['"', "'", '#', '\\']) or value.startswith('http'):
            raise ValueError(f'The {label} key does not look valid. Copy the full key, not a URL or project ID.')
    if anon == service:
        raise ValueError('The anon and service_role keys must be different.')
    if anon.startswith('sb_secret_') or service.startswith('sb_publishable_'):
        raise ValueError('The public and server-only keys appear to be swapped.')
    updates = {'SUPABASE_URL': url.rstrip('/'), 'NEXT_PUBLIC_SUPABASE_URL': url.rstrip('/'), 'SUPABASE_ANON_KEY': anon, 'SUPABASE_SERVICE_ROLE_KEY': service}
    output = []
    for line in lines:
        key = line.split('=', 1)[0].strip() if '=' in line and not line.lstrip().startswith('#') else None
        if key in updates:
            # Drop duplicate entries; append exactly one authoritative value below.
            continue
        output.append(line)
    output.extend(f'{key}="{value}"' for key, value in updates.items())
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=root, prefix='.env-setup-', delete=False) as temp:
            temp_name = temp.name
            os.chmod(temp_name, 0o600)
            temp.write('\n'.join(output) + '\n')
        os.replace(temp_name, target)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)
    print('\nSaved credentials in .env.local. No keys were displayed or committed.')
    print('Return to Codex and say “done” so the app connection can be checked.')


if __name__ == '__main__':
    try:
        configure()
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled. Your configuration was not changed.')
    except (ValueError, OSError) as error:
        print(f'\nSetup stopped: {error}')
