"""
Configuration module for IBM Security Verify API access.
Loads credentials and settings from environment variables.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Configuration class for IBM Security Verify API."""
    
    # API Credentials
    TENANT_URL = os.getenv('IBM_VERIFY_TENANT_URL', '')
    CLIENT_ID = os.getenv('IBM_VERIFY_CLIENT_ID', '')
    CLIENT_SECRET = os.getenv('IBM_VERIFY_CLIENT_SECRET', '')
    API_VERSION = os.getenv('IBM_VERIFY_API_VERSION', 'v2.0')
    
    # API Endpoints
    @property
    def base_url(self):
        """Get the base API URL."""
        return f"{self.TENANT_URL}/{self.API_VERSION}"
    
    @property
    def token_url(self):
        """Get the OAuth token endpoint."""
        return f"{self.TENANT_URL}/v1.0/endpoint/default/token"
    
    @property
    def applications_url(self):
        """Get the applications endpoint."""
        return f"{self.base_url}/applications"
    
    @property
    def federations_url(self):
        """Get the federations endpoint."""
        return f"{self.base_url}/federations"
    
    @property
    def mfa_url(self):
        """Get the MFA configurations endpoint."""
        return f"{self.base_url}/authnmethods"
    
    @property
    def attributes_url(self):
        """Get the attributes endpoint."""
        return f"{self.base_url}/attributes"
    
    # Request settings
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    RETRY_BACKOFF = float(os.getenv('RETRY_BACKOFF', '2.0'))
    
    # Pagination
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', '100'))
    
    # Output settings
    OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'data')
    
    def validate(self):
        """Validate that all required configuration is present."""
        if not self.TENANT_URL:
            raise ValueError("IBM_VERIFY_TENANT_URL is required")
        if not self.CLIENT_ID:
            raise ValueError("IBM_VERIFY_CLIENT_ID is required")
        if not self.CLIENT_SECRET:
            raise ValueError("IBM_VERIFY_CLIENT_SECRET is required")
        return True


# Create a global config instance
config = Config()
