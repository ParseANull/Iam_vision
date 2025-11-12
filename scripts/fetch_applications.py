"""
Fetch all applications from IBM Security Verify API.
Outputs data to data/applications.jsonl in JSONL format.
"""
import json
import logging
import time
from datetime import datetime
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class IBMVerifyClient:
    """Client for IBM Security Verify API with OAuth2 authentication."""
    
    def __init__(self):
        self.config = config
        self.access_token = None
        self.token_expires_at = 0
        self.session = self._create_session()
    
    def _create_session(self):
        """Create a requests session with retry logic."""
        session = requests.Session()
        retry_strategy = Retry(
            total=self.config.MAX_RETRIES,
            backoff_factor=self.config.RETRY_BACKOFF,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session
    
    def _get_access_token(self):
        """Obtain OAuth2 access token."""
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        logger.info("Obtaining new access token...")
        
        try:
            response = self.session.post(
                self.config.token_url,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.config.CLIENT_ID,
                    'client_secret': self.config.CLIENT_SECRET,
                    'scope': 'openid'
                },
                timeout=self.config.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = time.time() + expires_in - 60  # 60s buffer
            
            logger.info("Access token obtained successfully")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to obtain access token: {e}")
            raise
    
    def _make_request(self, url, params=None):
        """Make an authenticated API request."""
        token = self._get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        try:
            response = self.session.get(
                url,
                headers=headers,
                params=params,
                timeout=self.config.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise
    
    def fetch_applications(self):
        """
        Fetch all applications with pagination support.
        
        Yields:
            dict: Application data with metadata
        """
        logger.info("Starting to fetch applications...")
        
        offset = 0
        limit = self.config.DEFAULT_PAGE_SIZE
        total_fetched = 0
        
        while True:
            try:
                params = {
                    'limit': limit,
                    'offset': offset
                }
                
                logger.info(f"Fetching applications (offset={offset}, limit={limit})...")
                data = self._make_request(self.config.applications_url, params)
                
                applications = data.get('applications', [])
                if not applications:
                    logger.info("No more applications to fetch")
                    break
                
                for app in applications:
                    # Add metadata
                    enriched_app = {
                        'fetch_timestamp': datetime.utcnow().isoformat(),
                        'data': app
                    }
                    yield enriched_app
                    total_fetched += 1
                
                # Check if there are more pages
                total = data.get('total', 0)
                if offset + limit >= total:
                    break
                
                offset += limit
                
            except Exception as e:
                logger.error(f"Error fetching applications at offset {offset}: {e}")
                break
        
        logger.info(f"Successfully fetched {total_fetched} applications")


def main():
    """Main function to fetch applications and save to JSONL."""
    try:
        # Validate configuration
        config.validate()
        
        # Create output directory if it doesn't exist
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / 'applications.jsonl'
        
        # Initialize client
        client = IBMVerifyClient()
        
        # Fetch and write applications
        with open(output_file, 'w', encoding='utf-8') as f:
            for application in client.fetch_applications():
                f.write(json.dumps(application) + '\n')
        
        logger.info(f"Applications saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to fetch applications: {e}")
        raise


if __name__ == '__main__':
    main()
