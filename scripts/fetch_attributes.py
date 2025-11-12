"""
Fetch user attributes and schemas from IBM Security Verify API.
Outputs data to data/attributes.jsonl in JSONL format.
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


def fetch_attributes(client):
    """
    Fetch all user attributes with pagination support.
    
    Args:
        client: IBMVerifyClient instance
        
    Yields:
        dict: Attribute data with metadata
    """
    logger.info("Starting to fetch attributes...")
    
    offset = 0
    limit = config.DEFAULT_PAGE_SIZE
    total_fetched = 0
    
    while True:
        try:
            params = {
                'limit': limit,
                'offset': offset
            }
            
            logger.info(f"Fetching attributes (offset={offset}, limit={limit})...")
            data = client._make_request(config.attributes_url, params)
            
            attributes = data.get('attributes', data.get('schemas', []))
            if not attributes:
                logger.info("No more attributes to fetch")
                break
            
            for attribute in attributes:
                # Add metadata
                enriched_attribute = {
                    'fetch_timestamp': datetime.utcnow().isoformat(),
                    'attribute_id': attribute.get('id', attribute.get('name')),
                    'data': attribute
                }
                yield enriched_attribute
                total_fetched += 1
            
            # Check if there are more pages
            total = data.get('total', 0)
            if total == 0 or offset + limit >= total:
                break
            
            offset += limit
            
        except Exception as e:
            logger.error(f"Error fetching attributes at offset {offset}: {e}")
            break
    
    logger.info(f"Successfully fetched {total_fetched} attributes")


def main():
    """Main function to fetch attributes and save to JSONL."""
    try:
        # Validate configuration
        config.validate()
        
        # Create output directory if it doesn't exist
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / 'attributes.jsonl'
        
        # Initialize client
        client = IBMVerifyClient()
        
        # Fetch and write attributes
        with open(output_file, 'w', encoding='utf-8') as f:
            for attribute in fetch_attributes(client):
                f.write(json.dumps(attribute) + '\n')
        
        logger.info(f"Attributes saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to fetch attributes: {e}")
        raise


if __name__ == '__main__':
    main()
