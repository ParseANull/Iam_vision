"""Configuration module for IBM Security Verify API access.

This module handles all the boring-but-necessary configuration stuff.
We load credentials and settings from environment variables because 
hardcoding secrets is how we end up on Reddit's "bad code" threads.

Loads credentials and settings from environment variables.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# We're loading our secrets from .env like responsible adults
load_dotenv()


class Config:
    """Configuration class for IBM Security Verify API.
    
    We centralize all our config here so we're not hunting through
    a dozen files when something needs to change. Future us will
    thank present us for this moment of clarity.
    """
    
    # API Credentials - the keys to the kingdom
    # We pull these from environment variables for security
    TENANT_URL = os.getenv('IBM_VERIFY_TENANT_URL', '')
    CLIENT_ID = os.getenv('IBM_VERIFY_CLIENT_ID', '')
    CLIENT_SECRET = os.getenv('IBM_VERIFY_CLIENT_SECRET', '')
    API_VERSION = os.getenv('IBM_VERIFY_API_VERSION', 'v2.0')
    
    # API Endpoints - we use properties for dynamic URL construction
    @property
    def base_url(self):
        """Get the base API URL.
        
        Returns:
            str: The fully-qualified base URL for API calls.
        """
        # Construct our base URL from tenant and version
        return f"{self.TENANT_URL}/{self.API_VERSION}"
    
    @property
    def token_url(self):
        """Get the OAuth token endpoint.
        
        Returns:
            str: The URL where we beg for access tokens.
        """
        # OAuth tokens live at v1.0, because IBM likes to keep us on our toes
        return f"{self.TENANT_URL}/v1.0/endpoint/default/token"
    
    @property
    def applications_url(self):
        """Get the applications endpoint.
        
        Returns:
            str: The URL for fetching application data.
        """
        # Build the applications endpoint URL
        return f"{self.base_url}/applications"
    
    @property
    def federations_url(self):
        """Get the federations endpoint.
        
        Returns:
            str: The URL for federation configurations.
        """
        # Construct federations endpoint
        return f"{self.base_url}/federations"
    
    @property
    def mfa_url(self):
        """Get the MFA configurations endpoint.
        
        Returns:
            str: The URL for MFA method configurations.
        """
        # Build MFA endpoint URL
        return f"{self.base_url}/authnmethods"
    
    @property
    def attributes_url(self):
        """Get the attributes endpoint.
        
        Returns:
            str: The URL for user attribute schemas.
        """
        # Construct attributes endpoint
        return f"{self.base_url}/attributes"
    
    # Request settings - we're patient, but not infinitely so
    # Timeout in seconds before we give up on a request
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
    # How many times we'll retry before admitting defeat
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    # Exponential backoff multiplier (patience grows with each retry)
    RETRY_BACKOFF = float(os.getenv('RETRY_BACKOFF', '2.0'))
    
    # Pagination - fetching data in reasonable chunks
    # Default page size for paginated API requests
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', '100'))
    
    # Output settings - where we stash the goods
    # Directory path for storing fetched data files
    OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'data')
    
    def validate(self):
        """Validate that all required configuration is present.
        
        We check for essential credentials before attempting API calls.
        Better to fail fast with a clear error than mysteriously later.
        
        Returns:
            bool: True if validation passes.
            
        Raises:
            ValueError: If any required configuration is missing.
        """
        # Check each required field and complain loudly if missing
        if not self.TENANT_URL:
            # No tenant URL? Can't do much without knowing where to connect
            raise ValueError("IBM_VERIFY_TENANT_URL is required")
        if not self.CLIENT_ID:
            # Client ID is our identity - we need it
            raise ValueError("IBM_VERIFY_CLIENT_ID is required")
        if not self.CLIENT_SECRET:
            # The secret sauce - literally cannot authenticate without it
            raise ValueError("IBM_VERIFY_CLIENT_SECRET is required")
        # All checks passed - we're good to go
        return True


# Create a global config instance
# We instantiate this once and reuse it everywhere (singleton pattern, sort of)
config = Config()
