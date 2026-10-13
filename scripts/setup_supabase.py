#!/usr/bin/env python3
"""Configure local Supabase credentials without echoing them or changing Git state."""
from getpass import getpass
from pathlib import Path
from urllib.parse import urlparse
import os
import tempfile
import base64
import json


def key_error(value, label, project):
    if len(value) < 30 or any(c.isspace() for c in value) or any(c in value for c in ['"', "'", '#', '\\']) or value.startswith('http'):
        return f'The {label} key is missing or incomplete. Copy the full key, not a URL or project ID.'
    expected_prefix = 'sb_publishable_' if label == 'anon' else 'sb_secret_'
    if value.startswith(expected_prefix):
        return None
    if value.startswith(('sb_secret_', 'sb_publishable_')):
        return f'That is the wrong key type. Copy the {label} key.'
    try:
        if len(value.split('.')) != 3:
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(value.split('.')[1] + '==='))
        if not isinstance(payload, dict):
            raise ValueError()
    except (ValueError, UnicodeError):
        return f'The {label} key is not a complete Supabase key. Copy it again.'
    if payload.get('role') != label:
        return f'That is not a {label} key. Select the {label} row in Supabase API Keys.'
    if payload.get('ref') != project:
        return 'That key belongs to a different project. Copy both keys from the project URL shown above.'
    return None


def prompt_key(label, saved, project):
    saved_is_valid = bool(saved) and key_error(saved, label, project) is None
    suffix = ' or press Enter to keep the saved key' if saved_is_valid else ''
    while True:
        value = getpass(f'Paste {label} key{suffix} (hidden), then press Enter: ').strip()
        if not value and saved_is_valid:
            return saved
        error = key_error(value, label, project)
        if error:
            print(f'\n{error}\nPlease try again at this prompt. Nothing has been saved yet.\n')
        else:
            return value


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
    print('Key input is hidden: you will not see characters appear while pasting.')
    print('Paste keys only at these prompts, never at the normal % shell prompt.')
    print('Nothing you type here is sent to the chat. Press Ctrl+C to cancel.\n')
    url = input(f'Project URL [press Enter for {default}]: ').strip() or default
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.supabase.co') or parsed.path not in ('', '/') or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Use the project URL, such as https://your-project.supabase.co, without /rest/v1/.')
    project = parsed.hostname.split('.')[0]
    anon = prompt_key('anon', existing.get('SUPABASE_ANON_KEY', ''), project)
    print('Anon key format accepted. Next, copy the separate service_role key.\n')
    service = prompt_key('service_role', existing.get('SUPABASE_SERVICE_ROLE_KEY', ''), project)
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
