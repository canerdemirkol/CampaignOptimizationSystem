#!/usr/bin/env python3
"""
CLI script to encrypt sensitive .env values using CryptoService

IMPORTANT: This script requires cryptography library to be installed.
Install with: pip install cryptography>=41.0.0

Alternatively, use backend's npm run encrypt-env:
    cd backend && npm run encrypt-env

Then copy the encrypted values to python-service/.env

Usage:
    python scripts/encrypt_env.py                    # Encrypt all sensitive values in .env
    python scripts/encrypt_env.py --value "myvalue"  # Encrypt a single value
    python scripts/encrypt_env.py --decrypt "ENC:..." # Decrypt a single value
    python scripts/encrypt_env.py --key "custom-key" # Use a custom encryption key
"""
import sys
import os
import re
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from app.services.crypto_service import CryptoService
except ImportError as e:
    print("❌ ERROR: Could not import CryptoService")
    print(f"   Make sure cryptography is installed: pip install cryptography>=41.0.0")
    print(f"   Or use backend's npm run encrypt-env instead")
    print(f"\n   ImportError: {str(e)}")
    sys.exit(1)

ENV_PATH = Path(__file__).parent.parent / '.env'
SENSITIVE_KEYS = ['SERVICE_USERNAME', 'SERVICE_PASSWORD']


def load_env(env_path=None):
    """Load environment variables from .env file"""
    if env_path is None:
        env_path = ENV_PATH

    if not env_path.exists():
        print(f"❌ .env file not found at: {env_path}")
        sys.exit(1)

    env = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            if '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()

            # Remove surrounding quotes
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or \
               (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]

            env[key] = value

    return env


def encrypt_single_value(value: str, encryption_key: str):
    """Encrypt a single value and display result"""
    try:
        key_buffer = encryption_key[:32].encode('utf-8')
        encrypted = CryptoService.encrypt_with_key(value, key_buffer)
        enc_value = f"ENC:{encrypted}"

        print(f"\n✅ Encryption successful:")
        print(f"  Plaintext:  {value}")
        print(f"  Encrypted:  {enc_value}")

        # Verify by decrypting
        decrypted = CryptoService.decrypt_with_key(encrypted, key_buffer)
        if decrypted == value:
            print(f"  Verified:   ✓ OK")
        else:
            print(f"  Verified:   ✗ FAILED")

    except Exception as e:
        print(f"❌ Encryption failed: {str(e)}")
        sys.exit(1)


def decrypt_single_value(enc_value: str, encryption_key: str):
    """Decrypt a single ENC: value"""
    try:
        decrypted = CryptoService.decrypt_env_value(enc_value, encryption_key)
        print(f"\n✅ Decryption successful:")
        print(f"  Encrypted:  {enc_value}")
        print(f"  Decrypted:  {decrypted}")

    except Exception as e:
        print(f"❌ Decryption failed: {str(e)}")
        sys.exit(1)


def encrypt_env_file(env_path=None):
    """Encrypt all sensitive values in .env file"""
    if env_path is None:
        env_path = ENV_PATH

    env = load_env(env_path)
    encryption_key = env.get('ENCRYPTION_KEY', '')

    if not encryption_key or len(encryption_key) < 32:
        print("❌ ENCRYPTION_KEY must be at least 32 characters in .env")
        sys.exit(1)

    key_buffer = encryption_key[:32].encode('utf-8')

    print("🔐 Encrypting sensitive .env values...\n")
    print(f"📝 ENCRYPTION_KEY: {encryption_key} (kept as plaintext - master key)\n")

    with open(env_path, 'r') as f:
        content = f.read()

    updated_content = content

    for key in SENSITIVE_KEYS:
        value = env.get(key)

        if not value:
            print(f"  ⊘ {key}: not found, skipping")
            continue

        if value.startswith('ENC:'):
            print(f"  ⊘ {key}: already encrypted, skipping")
            continue

        try:
            encrypted = CryptoService.encrypt_with_key(value, key_buffer)
            enc_value = f"ENC:{encrypted}"

            # Verify
            decrypted = CryptoService.decrypt_with_key(encrypted, key_buffer)
            if decrypted != value:
                print(f"  ✗ {key}: encryption verification FAILED!")
                sys.exit(1)

            # Replace in file content (handle various formats)
            patterns = [
                f'{key}="{value}"',
                f"{key}='{value}'",
                f'{key}={value}',
            ]

            replaced = False
            for pattern in patterns:
                if pattern in updated_content:
                    updated_content = updated_content.replace(
                        pattern,
                        f'{key}="{enc_value}"'
                    )
                    replaced = True
                    break

            if replaced:
                print(f"  ✓ {key}: encrypted successfully")
                print(f"      Original:  {value[:30]}..." if len(value) > 30 else f"      Original:  {value}")
                print(f"      Encrypted: {enc_value[:40]}...")
            else:
                print(f"  ⚠ {key}: could not find in .env file for replacement")

        except Exception as e:
            print(f"  ✗ {key}: encryption failed: {str(e)}")
            sys.exit(1)

    # Write updated content
    with open(env_path, 'w') as f:
        f.write(updated_content)

    print(f"\n✅ .env file updated with encrypted values.")


def show_help():
    """Display help message"""
    print("""
Usage:
  python scripts/encrypt_env.py                      Encrypt SERVICE_USERNAME and SERVICE_PASSWORD in .env
  python scripts/encrypt_env.py --value "plaintext"  Encrypt a single value
  python scripts/encrypt_env.py --decrypt "ENC:..."  Decrypt a single value
  python scripts/encrypt_env.py --key "custom-key"   Use a custom encryption key

Options:
  --value     Encrypt a single plaintext value
  --decrypt   Decrypt a single ENC: value
  --key       Override ENCRYPTION_KEY (otherwise reads from .env)
  --help, -h  Show this help message
    """)


if __name__ == '__main__':
    args = sys.argv[1:]

    if '--help' in args or '-h' in args:
        show_help()
        sys.exit(0)

    # Load environment
    env = load_env()
    encryption_key = env.get('ENCRYPTION_KEY', '')

    # Check for custom key
    if '--key' in args:
        key_idx = args.index('--key')
        if key_idx + 1 < len(args):
            encryption_key = args[key_idx + 1]

    if not encryption_key or len(encryption_key) < 32:
        print("❌ ENCRYPTION_KEY must be at least 32 characters")
        sys.exit(1)

    # Handle different modes
    if '--value' in args:
        value_idx = args.index('--value')
        if value_idx + 1 < len(args):
            value = args[value_idx + 1]
            encrypt_single_value(value, encryption_key)
        else:
            print("❌ --value requires a plaintext argument")
            sys.exit(1)

    elif '--decrypt' in args:
        decrypt_idx = args.index('--decrypt')
        if decrypt_idx + 1 < len(args):
            enc_value = args[decrypt_idx + 1]
            decrypt_single_value(enc_value, encryption_key)
        else:
            print("❌ --decrypt requires an ENC: value argument")
            sys.exit(1)

    else:
        # Default: encrypt .env file
        encrypt_env_file()
