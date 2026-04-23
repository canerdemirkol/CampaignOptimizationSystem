#!/usr/bin/env python3
"""
Utility to encrypt service credentials
Usage:
    python encrypt_credentials.py "username" "password"

This will output encrypted values to paste into .env file
"""
import sys
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

ALGORITHM = 'aes-256-gcm'
IV_LENGTH = 16
TAG_LENGTH = 16
ENC_PREFIX = 'ENC:'


def encrypt(plaintext: str, key_string: str) -> str:
    """Encrypt plaintext using AES-256-GCM"""
    if len(key_string) < 32:
        raise ValueError('Key must be at least 32 characters')

    key_buffer = key_string[:32].encode('utf-8')
    iv = os.urandom(IV_LENGTH)

    cipher = Cipher(
        algorithms.AES(key_buffer),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()

    ciphertext = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
    auth_tag = encryptor.tag

    combined = iv + auth_tag + ciphertext
    return base64.b64encode(combined).decode('utf-8')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python encrypt_credentials.py <username> <password>')
        print('Example: python encrypt_credentials.py "admin" "secure_password"')
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]
    encryption_key = "b14ca5898a4e4142aace2ea2143a2410"

    try:
        encrypted_user = encrypt(username, encryption_key)
        encrypted_pass = encrypt(password, encryption_key)

        print("\n✅ Encrypted credentials (copy to .env):\n")
        print(f"SERVICE_USERNAME=ENC:{encrypted_user}")
        print(f"SERVICE_PASSWORD=ENC:{encrypted_pass}")
        print("\n💡 Add ENCRYPTION_KEY to .env as well:")
        print(f'ENCRYPTION_KEY="{encryption_key}"')

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)
