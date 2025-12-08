"""Configuration module for IBM Security Verify API access.

This module handles all the boring-but-necessary configuration stuff.
We load credentials and settings from environment variables because 
hardcoding secrets is how we end up on Reddit's "bad code" threads.

Loads credentials and settings from environment variables.
"""
import os
from pathlib import Path
from dotenv import load_dotenv


class Config:
    """Configuration class for IBM Security Verify API.
    
    We centralize all our config here so we're not hunting through
    a dozen files when something needs to change. Future us will
    thank present us for this moment of clarity.
    """
    
    def __init__(self, env_name=None):
        """Initialize configuration by reading from environment variables.
        
        We load these in __init__ so they're evaluated when the instance
        is created, not when the class is defined. This lets us reload
        config for different environments.
        
        Args:
            env_name (str, optional): Environment name to load (e.g., 'bidevt', 'wiprt').
                                     If provided, loads from .env.{env_name} file.
                                     If None, loads from default .env file or existing env vars.
        """
        # Load environment-specific .env file if env_name is provided
        if env_name:
            # Get the project root directory (one level up from scripts/)
            project_root = Path(__file__).parent.parent
            env_file = project_root / f'.env.{env_name}'
            if env_file.exists():
                # Override=True ensures we reload even if vars are already set
                load_dotenv(env_file, override=True)
            else:
                raise FileNotFoundError(f"Environment file not found: {env_file}")
        else:
            # Load from default .env file if it exists
            load_dotenv()
        
        # Load credentials from environment variables
        self.TENANT_URL = os.getenv('IBM_VERIFY_TENANT_URL', '')
        self.CLIENT_ID = os.getenv('IBM_VERIFY_CLIENT_ID', '')
        self.CLIENT_SECRET = os.getenv('IBM_VERIFY_CLIENT_SECRET', '')
        # Default to v1.0 for applications endpoint (can be overridden per-endpoint)
        self.API_VERSION = os.getenv('IBM_VERIFY_API_VERSION', 'v1.0')
        
        # Request settings - we're patient, but not infinitely so
        # Timeout in seconds before we give up on a request
        self.REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
        # How many times we'll retry before admitting defeat
        self.MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
        # Exponential backoff multiplier (patience grows with each retry)
        self.RETRY_BACKOFF = float(os.getenv('RETRY_BACKOFF', '2.0'))
        
        # Pagination - fetching data in reasonable chunks
        # Default page size for paginated API requests
        self.DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', '100'))
        
        # Output settings - where we stash the goods
        # Directory path for storing fetched data files
        self.OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'data')
    
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
        # Federations use v1.0 SAML endpoint per IBM Verify API docs
        return f"{self.TENANT_URL}/v1.0/saml/federations"
    
    @property
    def mfa_url(self):
        """Get the MFA configurations endpoint.
        
        Returns:
            str: The URL for MFA authenticators configurations.
        """
        # Use v1.0 authenticators endpoint - returns configured MFA authenticators
        return f"{self.TENANT_URL}/v1.0/authenticators"
    
    @property
    def factors_url(self):
        """Get the MFA factors endpoint.
        
        Returns:
            str: The URL for MFA factors (v2.0 endpoint).
        """
        # Use v2.0 factors endpoint - returns MFA factor configurations
        return f"{self.TENANT_URL}/v2.0/factors"
    
    @property
    def attributes_url(self):
        """Get the attributes endpoint.
        
        Returns:
            str: The URL for user attribute schemas.
        """
        # Attributes use v1.0 endpoint per IBM Verify API docs
        return f"{self.TENANT_URL}/v1.0/attributes"
    
    @property
    def groups_url(self):
        """Get the groups endpoint.
        
        Returns:
            str: The URL for group data.
        """
        # Groups use v2.0 endpoint per Groups Management Version 2.0 docs
        return f"{self.TENANT_URL}/v2.0/Groups"
    
    
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


# Helper function to create a config instance for a specific environment
# Use this instead of the old global singleton pattern
def get_config(env_name=None):
    """Get a Config instance for the specified environment.
    
    Args:
        env_name (str, optional): Environment name (e.g., 'bidevt', 'wiprt').
                                 If None, uses default .env or existing env vars.
    
    Returns:
        Config: Configured instance ready to use.
    """
    return Config(env_name)
