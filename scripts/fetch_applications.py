"""Fetch all applications from IBM Security Verify API.

This script does the heavy lifting of pulling application data from IBM's API.
We paginate through results because trying to fetch everything at once is 
a recipe for timeouts and sad faces.

Outputs data to data/applications.jsonl in JSONL format (one JSON object per line,
because newline-delimited JSON is our jam for streaming data).
"""
# Standard library imports - the ones that come with Python
import argparse
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

# Third-party imports - the fancy stuff we pip installed
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Local imports - our own masterpieces
from config import get_config

# Configure logging - we're setting up our breadcrumb trail
# DEBUG level for troubleshooting credentials
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Create our logger instance - this is how we shout into the void
logger = logging.getLogger(__name__)


class IBMVerifyClient:
    """Client for IBM Security Verify API with OAuth2 authentication.
    
    This class handles all the fun of OAuth2 token management and HTTP requests.
    We keep tokens alive, retry failed requests, and generally try to make
    the API behave nicely even when it's having a bad day.
    """
    
    def __init__(self, config_instance=None):
        """Initialize the IBM Verify API client.
        
        We set up our config, prepare token storage, and create a session
        with retry logic. Because networks are flaky and APIs are moody.
        
        Args:
            config_instance (Config, optional): Configuration instance to use.
                                               If None, uses module-level config.
        """
        # Store our configuration reference for later use
        self.config = config_instance if config_instance is not None else config
        # Token storage - starts as None until we authenticate
        self.access_token = None
        # Track when our token expires (Unix timestamp)
        self.token_expires_at = 0
        # Create our HTTP session with built-in retry logic
        self.session = self._create_session()
    
    def _create_session(self):
        """Create a requests session with retry logic.
        
        We configure automatic retries for common transient failures.
        When the API returns 429 (rate limit) or 5xx (server errors),
        we'll back off exponentially and try again. Persistence is key.
        
        Returns:
            requests.Session: A configured session with retry adapter.
        """
        # Create a new session object - this will persist connections
        session = requests.Session()
        # Configure our retry strategy with exponential backoff
        retry_strategy = Retry(
            total=self.config.MAX_RETRIES,  # Maximum number of retry attempts
            backoff_factor=self.config.RETRY_BACKOFF,  # Exponential multiplier
            status_forcelist=[429, 500, 502, 503, 504],  # HTTP codes worth retrying
            allowed_methods=["GET", "POST"]  # Only retry idempotent operations
        )
        # Create an adapter with our retry strategy attached
        adapter = HTTPAdapter(max_retries=retry_strategy)
        # Mount the adapter for both HTTP and HTTPS requests
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        # Return our battle-hardened session
        return session
    
    def _get_access_token(self):
        """Obtain OAuth2 access token.
        
        We handle token lifecycle management here - checking if our current
        token is still valid, and fetching a fresh one when needed. We add
        a 60-second buffer before expiration because cutting it close leads
        to authentication errors at the worst possible moments.
        
        Returns:
            str: A valid OAuth2 access token.
            
        Raises:
            requests.exceptions.RequestException: If token fetch fails.
        """
        # Check if we already have a valid token (reuse is efficient)
        if self.access_token and time.time() < self.token_expires_at:
            # Token is still fresh - no need to fetch a new one
            return self.access_token
        
        # Token is expired or missing - time to get a new one
        logger.info("Obtaining new access token...")
        logger.debug(f"Token URL: {self.config.token_url}")
        logger.debug(f"Client ID: {self.config.CLIENT_ID}")
        logger.debug(f"Tenant: {self.config.TENANT_URL}")
        
        try:
            # Make POST request to token endpoint with credentials
            response = self.session.post(
                self.config.token_url,
                data={
                    'grant_type': 'client_credentials',  # OAuth2 grant type
                    'client_id': self.config.CLIENT_ID,  # Who we claim to be
                    'client_secret': self.config.CLIENT_SECRET,  # Proof of identity
                    'scope': 'openid'  # Permissions we're requesting
                },
                timeout=self.config.REQUEST_TIMEOUT
            )
            # Raise exception for HTTP errors (4xx, 5xx status codes)
            response.raise_for_status()
            
            # Parse the JSON response containing our new token
            token_data = response.json()
            # Extract and store the access token
            self.access_token = token_data['access_token']
            # Get token lifetime (default 1 hour if not specified)
            expires_in = token_data.get('expires_in', 3600)
            # Calculate expiration time with 60-second safety buffer
            self.token_expires_at = time.time() + expires_in - 60
            
            logger.info("Access token obtained successfully")
            # Return the shiny new token
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            # Authentication failed - log it and re-raise
            logger.error(f"Failed to obtain access token: {e}")
            raise
    
    def _make_request(self, url, params=None):
        """Make an authenticated API request.
        
        This is our workhorse method for all API calls. We handle authentication,
        set proper headers, and parse JSON responses. The session handles retries
        automatically, so we don't need to manually loop here.
        
        Args:
            url (str): The full URL to request.
            params (dict, optional): Query parameters to include in the request.
            
        Returns:
            dict: Parsed JSON response from the API.
            
        Raises:
            requests.exceptions.RequestException: If the request fails.
        """
        # Fetch a valid access token (may reuse cached token)
        token = self._get_access_token()
        # Build our request headers with authentication and content type
        headers = {
            'Authorization': f'Bearer {token}',  # OAuth2 bearer token
            'Accept': 'application/json'  # We expect JSON responses
        }
        
        try:
            # Make the GET request with our configured session
            response = self.session.get(
                url,
                headers=headers,
                params=params,  # Query parameters (can be None)
                timeout=self.config.REQUEST_TIMEOUT
            )
            # Raise an exception if we got an HTTP error status
            response.raise_for_status()
            
            # Log response details for debugging
            logger.debug(f"Response status: {response.status_code}")
            logger.debug(f"Response content-type: {response.headers.get('content-type')}")
            logger.debug(f"Response body (first 500 chars): {response.text[:500]}")
            
            # Parse and return the JSON response body
            return response.json()
            
        except requests.exceptions.RequestException as e:
            # Request failed - log the error and re-raise
            logger.error(f"API request failed: {e}")
            raise
    
    def _make_scim_request(self, url, params=None):
        """Make an authenticated SCIM API request.
        
        SCIM (System for Cross-domain Identity Management) endpoints require
        a different Accept header (application/scim+json) than standard JSON APIs.
        This method is specifically for v2.0 Groups and Users endpoints.
        
        Args:
            url (str): The full URL to request.
            params (dict, optional): Query parameters to include in the request.
            
        Returns:
            dict: Parsed JSON response from the API.
            
        Raises:
            requests.exceptions.RequestException: If the request fails.
        """
        # Fetch a valid access token (may reuse cached token)
        token = self._get_access_token()
        # Build our request headers with authentication and SCIM content type
        headers = {
            'Authorization': f'Bearer {token}',  # OAuth2 bearer token
            'Accept': 'application/scim+json'  # SCIM requires this specific content type
        }
        
        try:
            # Make the GET request with our configured session
            response = self.session.get(
                url,
                headers=headers,
                params=params,  # Query parameters (can be None)
                timeout=self.config.REQUEST_TIMEOUT
            )
            # Raise an exception if we got an HTTP error status
            response.raise_for_status()
            
            # Log response details for debugging
            logger.debug(f"SCIM Response status: {response.status_code}")
            logger.debug(f"SCIM Response content-type: {response.headers.get('content-type')}")
            logger.debug(f"SCIM Response body (first 500 chars): {response.text[:500]}")
            
            # Parse and return the JSON response body
            return response.json()
            
        except requests.exceptions.RequestException as e:
            # Request failed - log the error and re-raise
            logger.error(f"SCIM API request failed: {e}")
            raise
    
    def fetch_applications(self):
        """Fetch all applications with pagination support.
        
        We paginate through the API results to avoid overwhelming the server
        or running into memory limits. This generator yields applications one
        at a time as we fetch them, which is memory-efficient and allows for
        streaming processing.
        
        Yields:
            dict: Application data enriched with fetch timestamp metadata.
        """
        logger.info("Starting to fetch applications...")
        
        # Initialize pagination state - we start at the beginning
        offset = 0
        # Grab page size from config (how many items per request)
        limit = self.config.DEFAULT_PAGE_SIZE
        # Track total count for logging purposes
        total_fetched = 0
        
        # Loop until we've fetched all pages
        while True:
            try:
                # Build query parameters for this page
                params = {
                    'limit': limit,  # How many items to fetch
                    'offset': offset  # Starting position in result set
                }
                
                logger.info(f"Fetching applications (offset={offset}, limit={limit})...")
                # Make the API request for this page
                data = self._make_request(self.config.applications_url, params)
                
                # Extract applications array from response
                # The API returns applications under _embedded.applications key (v1.0 structure)
                embedded = data.get('_embedded', {})
                applications = embedded.get('applications', [])
                # Check if we got any results
                if not applications:
                    # Empty page means we've reached the end
                    logger.info("No more applications to fetch")
                    break
                
                # Process each application in this page
                for app in applications:
                    # Extract application ID from the href link
                    # The API returns ID in _links.self.href like "/appaccess/v1.0/applications/123456"
                    app_id = None
                    if '_links' in app and 'self' in app['_links']:
                        href = app['_links']['self'].get('href', '')
                        # Extract ID from the URL (last part after final /)
                        if href:
                            app_id = href.split('/')[-1]
                            # Add the ID to the app data for easier access later
                            app['id'] = app_id
                    
                    # Enrich application data with metadata
                    enriched_app = {
                        'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When we got it
                        'data': app  # The actual application data
                    }
                    # Yield this application (generator pattern)
                    yield enriched_app
                    # Increment our running total
                    total_fetched += 1
                
                # Check if there are more pages to fetch
                total = data.get('total', 0)
                # If we've fetched everything, we're done
                if offset + limit >= total:
                    break
                
                # Move to the next page by updating offset
                offset += limit
                
            except Exception as e:
                # Something went wrong - log it and stop pagination
                logger.error(f"Error fetching applications at offset {offset}: {e}")
                break
        
        # Log final statistics
        logger.info(f"Successfully fetched {total_fetched} applications")


def main(config):
    """Main function to fetch applications and save to JSONL.
    
    This is our entry point. We validate config, set up output paths,
    create our client, and stream application data to a JSONL file.
    Using a generator pattern means we write as we fetch, which is
    memory-efficient even for large datasets.
    
    Args:
        config (Config): Configuration instance with credentials loaded.
    """
    try:
        # Validate configuration before doing anything else
        # Better to fail early with clear error than mysteriously later
        config.validate()
        
        # Set up output directory path using pathlib (cross-platform paths)
        output_dir = Path(config.OUTPUT_DIR)
        # Create directory if it doesn't exist (exist_ok prevents errors)
        output_dir.mkdir(exist_ok=True)
        
        # Build full path to output file
        output_file = output_dir / 'applications.jsonl'
        
        # Initialize our API client (handles auth and requests)
        client = IBMVerifyClient(config)
        
        # Fetch and write applications in streaming fashion
        # We open file in write mode with UTF-8 encoding
        with open(output_file, 'w', encoding='utf-8') as f:
            # Iterate through applications as they're fetched
            for application in client.fetch_applications():
                # Write each application as a JSON line
                f.write(json.dumps(application) + '\n')
        
        # Success! Log where we saved the data
        logger.info(f"Applications saved to {output_file}")
        
    except Exception as e:
        # Something went wrong - log error and re-raise
        logger.error(f"Failed to fetch applications: {e}")
        raise


# Standard Python idiom - run main() if executed directly
if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fetch applications from IBM Security Verify')
    parser.add_argument('--env', type=str, help='Environment name (e.g., bidevt, wiprt)')
    args = parser.parse_args()
    
    # Load config for the specified environment
    config = get_config(args.env)
    
    # Now run main with the loaded config
    main(config)
