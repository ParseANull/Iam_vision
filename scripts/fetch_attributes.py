"""Fetch user attributes and schemas from IBM Security Verify API.

Attributes are like the fields in a user profile - first name, last name,
email, that sort of thing. We fetch the schema definitions so we know
what fields exist and what rules they follow. It's metadata about metadata,
which is either fascinating or makes your head hurt depending on the day.

Outputs data to data/attributes.jsonl in JSONL format.
"""
# Standard library imports
import json
import logging
from datetime import datetime
from pathlib import Path

# Local imports - leveraging our existing client
from fetch_applications import IBMVerifyClient
from config import config

# Configure logging - breadcrumbs for troubleshooting
# INFO level: chatty enough to know what's happening, not overwhelming
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Logger instance for this module
logger = logging.getLogger(__name__)


def fetch_attributes(client):
    """Fetch all user attributes with pagination support.
    
    We paginate through attribute schemas because there could be a lot of them.
    This is a generator that yields attributes one at a time for memory efficiency.
    The API response structure varies (sometimes 'attributes', sometimes 'schemas'),
    so we check for both like paranoid developers should.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        
    Yields:
        dict: Attribute data enriched with fetch timestamp and metadata.
    """
    logger.info("Starting to fetch attributes...")
    
    # Initialize pagination variables
    offset = 0  # Starting position in result set
    limit = config.DEFAULT_PAGE_SIZE  # How many to fetch per request
    total_fetched = 0  # Running count for logging
    
    # Loop until we've fetched all pages
    while True:
        try:
            # Build query parameters for pagination
            params = {
                'limit': limit,  # Page size
                'offset': offset  # Starting position
            }
            
            logger.info(f"Fetching attributes (offset={offset}, limit={limit})...")
            # Make API request for this page
            data = client._make_request(config.attributes_url, params)
            
            # Extract attributes array - API uses different field names
            # (because consistency is for people who don't like debugging)
            attributes = data.get('attributes', data.get('schemas', []))
            # Check if we got any results
            if not attributes:
                # Empty result means we're done
                logger.info("No more attributes to fetch")
                break
            
            # Process each attribute in this page
            for attribute in attributes:
                # Enrich with metadata
                enriched_attribute = {
                    'fetch_timestamp': datetime.utcnow().isoformat(),  # When fetched
                    'attribute_id': attribute.get('id', attribute.get('name')),  # ID or name
                    'data': attribute  # The actual attribute schema
                }
                # Yield this attribute (generator pattern)
                yield enriched_attribute
                # Increment counter
                total_fetched += 1
            
            # Check if there are more pages
            total = data.get('total', 0)
            # If total is 0 or we've fetched everything, stop
            if total == 0 or offset + limit >= total:
                break
            
            # Move to next page
            offset += limit
            
        except Exception as e:
            # Error fetching this page - log and stop
            logger.error(f"Error fetching attributes at offset {offset}: {e}")
            break
    
    # Log final count
    logger.info(f"Successfully fetched {total_fetched} attributes")


def main():
    """Main function to fetch attributes and save to JSONL.
    
    We orchestrate the whole process: validate config, create output directory,
    initialize the client, fetch attributes, and write them to a file.
    Using a generator means we stream data to disk instead of loading
    everything into memory (which would be a bad time with large datasets).
    """
    try:
        # Validate configuration (fail fast with clear errors)
        config.validate()
        
        # Set up output directory using pathlib
        output_dir = Path(config.OUTPUT_DIR)
        # Create directory if needed (exist_ok prevents errors if already there)
        output_dir.mkdir(exist_ok=True)
        
        # Build output file path
        output_file = output_dir / 'attributes.jsonl'
        
        # Initialize API client (handles authentication)
        client = IBMVerifyClient()
        
        # Fetch and write attributes in streaming fashion
        # Open file in write mode with UTF-8 encoding
        with open(output_file, 'w', encoding='utf-8') as f:
            # Iterate through attributes as they're fetched
            for attribute in fetch_attributes(client):
                # Write each attribute as a JSON line
                f.write(json.dumps(attribute) + '\n')
        
        # Success! Log where we saved the data
        logger.info(f"Attributes saved to {output_file}")
        
    except Exception as e:
        # Top-level error handler
        logger.error(f"Failed to fetch attributes: {e}")
        raise


if __name__ == '__main__':
    main()
