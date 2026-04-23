"""
Authentication Service for Service-to-Service Communication
Manages token retrieval using encrypted credentials
"""
import os
import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.services.crypto_service import get_crypto_service

logger = logging.getLogger(__name__)


class AuthService:
    """Handles service-to-service authentication with backend"""

    def __init__(self):
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.crypto_service = get_crypto_service()
        self.token_cache: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

    def _get_credentials(self) -> tuple[str, str]:
        """
        Get and decrypt service credentials from environment
        Returns: (username, password)
        """
        username = os.getenv('SERVICE_USERNAME', '')
        password = os.getenv('SERVICE_PASSWORD', '')

        # Decrypt if credentials have ENC: prefix
        username = self.crypto_service.decrypt_env(username)
        password = self.crypto_service.decrypt_env(password)

        if not username or not password:
            raise ValueError('SERVICE_USERNAME and SERVICE_PASSWORD are required')

        return username, password

    async def get_token(self, force_refresh: bool = False) -> str:
        """
        Get valid access token
        Uses cache if token is still valid, otherwise fetches new token
        Backend returns token in httpOnly cookie, not JSON body
        """
        # Check cache first
        if not force_refresh and self.token_cache and self.token_expiry:
            if datetime.now() < self.token_expiry:
                return self.token_cache

        # Fetch new token
        try:
            username, password = self._get_credentials()

            # Use cookie jar to capture httpOnly cookies
            async with httpx.AsyncClient(cookies=httpx.Cookies()) as client:
                response = await client.post(
                    f"{self.backend_url}/api/auth/login",
                    json={
                        "username": username,
                        "password": password,
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Authentication failed: {response.status_code} - {response.text}"
                    )
                    raise ValueError(f"Failed to authenticate: {response.text}")

                # Extract token from httpOnly cookie (backend stores it there)
                token = client.cookies.get('access_token')

                if not token:
                    # Fallback: try to get from JSON response (for backwards compatibility)
                    data = response.json()
                    token = data.get('accessToken')

                if not token:
                    raise ValueError("No access token in response or cookies")

                # Cache token for 14 minutes (15 min - 1 min buffer)
                self.token_cache = token
                self.token_expiry = datetime.now() + timedelta(minutes=14)

                logger.info("Successfully obtained new access token from httpOnly cookie")
                return token

        except Exception as e:
            logger.error(f"Error getting authentication token: {str(e)}")
            raise

    async def get_auth_headers(self, force_refresh: bool = False) -> dict:
        """
        Get authorization headers for requests.

        Pass force_refresh=True to bypass the cached token and fetch a fresh
        one (used when a caller sees a 401 mid-stream and needs to recover).
        """
        token = await self.get_token(force_refresh=force_refresh)
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }


# Global instance
_auth_service = None


def get_auth_service() -> AuthService:
    """Get or create global auth service instance"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
