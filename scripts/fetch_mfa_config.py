"""
Fetch MFA configurations and policies from IBM Security Verify API.
Outputs data to data/mfa_configurations.jsonl in JSONL format.
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


def fetch_mfa_configurations(client):
    """
    Fetch all MFA configurations with pagination support.
    
    Args:
        client: IBMVerifyClient instance
        
    Yields:
        dict: MFA configuration data with metadata
    """
    logger.info("Starting to fetch MFA configurations...")
    
    offset = 0
    limit = config.DEFAULT_PAGE_SIZE
    total_fetched = 0
    
    while True:
        try:
            params = {
                'limit': limit,
                'offset': offset
            }
            
            logger.info(f"Fetching MFA configs (offset={offset}, limit={limit})...")
            data = client._make_request(config.mfa_url, params)
            
            # Handle different response structures
            mfa_methods = data.get('methods', data.get('authnMethods', []))
            if not mfa_methods:
                logger.info("No more MFA configurations to fetch")
                break
            
            for method in mfa_methods:
                # Fetch detailed configuration for each method
                method_id = method.get('id')
                if method_id:
                    try:
                        detail_url = f"{config.mfa_url}/{method_id}"
                        detail_data = client._make_request(detail_url)
                        
                        enriched_method = {
                            'fetch_timestamp': datetime.utcnow().isoformat(),
                            'method_id': method_id,
                            'data': detail_data
                        }
                        yield enriched_method
                        total_fetched += 1
                    except Exception as e:
                        logger.warning(f"Could not fetch details for MFA method {method_id}: {e}")
                        # Still yield basic data
                        enriched_method = {
                            'fetch_timestamp': datetime.utcnow().isoformat(),
                            'method_id': method_id,
                            'data': method
                        }
                        yield enriched_method
                        total_fetched += 1
            
            # Check if there are more pages
            total = data.get('total', 0)
            if total == 0 or offset + limit >= total:
                break
            
            offset += limit
            
        except Exception as e:
            logger.error(f"Error fetching MFA configurations at offset {offset}: {e}")
            break
    
    logger.info(f"Successfully fetched {total_fetched} MFA configurations")


def main():
    """Main function to fetch MFA configurations and save to JSONL."""
    try:
        # Validate configuration
        config.validate()
        
        # Create output directory if it doesn't exist
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / 'mfa_configurations.jsonl'
        
        # Initialize client
        client = IBMVerifyClient()
        
        # Fetch and write MFA configurations
        with open(output_file, 'w', encoding='utf-8') as f:
            for mfa_config in fetch_mfa_configurations(client):
                f.write(json.dumps(mfa_config) + '\n')
        
        logger.info(f"MFA configurations saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to fetch MFA configurations: {e}")
        raise


if __name__ == '__main__':
    main()
