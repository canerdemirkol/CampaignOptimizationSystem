"""
AES-256-GCM Encryption Service
Mirrors Backend's cryptography implementation
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


ALGORITHM = 'aes-256-gcm'
IV_LENGTH = 16
TAG_LENGTH = 16
ENC_PREFIX = 'ENC:'


class CryptoService:
    """AES-256-GCM Encryption/Decryption Service"""

    def __init__(self):
        """Initialize with ENCRYPTION_KEY from environment"""
        self.encryption_key = self._load_key()

    def _load_key(self) -> bytes:
        """Load and validate encryption key from environment"""
        key = os.getenv('ENCRYPTION_KEY', '')
        if not key:
            raise ValueError('ENCRYPTION_KEY environment variable is required')
        if len(key) < 32:
            raise ValueError('ENCRYPTION_KEY must be at least 32 characters (256 bits)')
        # Use first 32 characters (256 bits)
        return key[:32].encode('utf-8')

    @staticmethod
    def decrypt_with_key(encrypted_data: str, key_buffer: bytes) -> str:
        """
        Decrypt ciphertext encrypted with AES-256-GCM
        Input: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext, base64 encoded
        """
        try:
            combined = base64.b64decode(encrypted_data)

            iv = combined[:IV_LENGTH]
            auth_tag = combined[IV_LENGTH:IV_LENGTH + TAG_LENGTH]
            ciphertext = combined[IV_LENGTH + TAG_LENGTH:]

            cipher = Cipher(
                algorithms.AES(key_buffer),
                modes.GCM(iv, auth_tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()

            decrypted = decryptor.update(ciphertext) + decryptor.finalize()
            return decrypted.decode('utf-8')
        except Exception as e:
            raise ValueError(f'Decryption failed: {str(e)}')

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt using service's encryption key"""
        return self.decrypt_with_key(encrypted_data, self.encryption_key)

    @staticmethod
    def encrypt_with_key(plaintext: str, key_buffer: bytes) -> str:
        """
        Encrypt plaintext using AES-256-GCM
        Output: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext, base64 encoded
        Mirrors Backend's implementation
        """
        try:
            iv = os.urandom(IV_LENGTH)
            cipher = Cipher(
                algorithms.AES(key_buffer),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()

            encrypted = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
            auth_tag = encryptor.tag

            combined = iv + auth_tag + encrypted
            return base64.b64encode(combined).decode('utf-8')
        except Exception as e:
            raise ValueError(f'Encryption failed: {str(e)}')

    def encrypt(self, plaintext: str) -> str:
        """Encrypt using service's encryption key"""
        return self.encrypt_with_key(plaintext, self.encryption_key)

    @staticmethod
    def decrypt_env_value(value: str | None, encryption_key: str) -> str:
        """
        Decrypt an env value if it has the ENC: prefix, otherwise return as-is
        """
        if not value:
            return ''
        if value.startswith(ENC_PREFIX):
            key_buffer = encryption_key[:32].encode('utf-8')
            return CryptoService.decrypt_with_key(value[len(ENC_PREFIX):], key_buffer)
        return value

    def decrypt_env(self, value: str | None) -> str:
        """Decrypt env value using service's key"""
        return self.decrypt_env_value(value, self.encryption_key.decode('utf-8'))


# Global instance
_crypto_service = None


def get_crypto_service() -> CryptoService:
    """Get or create global crypto service instance"""
    global _crypto_service
    if _crypto_service is None:
        _crypto_service = CryptoService()
    return _crypto_service
