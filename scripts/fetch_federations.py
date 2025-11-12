"""
Fetch federation configurations from IBM Security Verify API.
Outputs data to data/federations.jsonl in JSONL format.
"""
import json
import logging
from datetime import datetime
from pathlib import Path

from fetch_applications import IBMVerifyClient
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_federations(client):
    """
    Fetch all federation configurations with pagination support.
    
    Args:
        client: IBMVerifyClient instance
        
    Yields:
        dict: Federation data with metadata
    """
    logger.info("Starting to fetch federations...")
    
    offset = 0
    limit = config.DEFAULT_PAGE_SIZE
    total_fetched = 0
    
    while True:
        try:
            params = {
                'limit': limit,
                'offset': offset
            }
            
            logger.info(f"Fetching federations (offset={offset}, limit={limit})...")
            data = client._make_request(config.federations_url, params)
            
            federations = data.get('federations', [])
            if not federations:
                logger.info("No more federations to fetch")
                break
            
            for federation in federations:
                # Fetch detailed configuration for each federation
                federation_id = federation.get('id')
                if federation_id:
                    try:
                        detail_url = f"{config.federations_url}/{federation_id}"
                        detail_data = client._make_request(detail_url)
                        
                        enriched_federation = {
                            'fetch_timestamp': datetime.utcnow().isoformat(),
                            'federation_id': federation_id,
                            'data': detail_data
                        }
                        yield enriched_federation
                        total_fetched += 1
                    except Exception as e:
                        logger.warning(f"Could not fetch details for federation {federation_id}: {e}")
            
            # Check if there are more pages
            total = data.get('total', 0)
            if offset + limit >= total:
                break
            
            offset += limit
            
        except Exception as e:
            logger.error(f"Error fetching federations at offset {offset}: {e}")
            break
    
    logger.info(f"Successfully fetched {total_fetched} federations")


def main():
    """Main function to fetch federations and save to JSONL."""
    try:
        # Validate configuration
        config.validate()
        
        # Create output directory if it doesn't exist
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / 'federations.jsonl'
        
        # Initialize client
        client = IBMVerifyClient()
        
        # Fetch and write federations
        with open(output_file, 'w', encoding='utf-8') as f:
            for federation in fetch_federations(client):
                f.write(json.dumps(federation) + '\n')
        
        logger.info(f"Federations saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to fetch federations: {e}")
        raise


if __name__ == '__main__':
    main()
