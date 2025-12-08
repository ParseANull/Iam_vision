"""Fetch federation configurations from IBM Security Verify API.

Federations are how we connect with external identity providers - think
SAML, OAuth, that kind of party. We fetch the configurations so we know
who's invited to the identity provider dance and what the rules are.
Because nothing says "enterprise software" quite like federation configs.

Outputs data to data/federations.jsonl in JSONL format.
"""
# Standard library imports
import json
import logging
from datetime import datetime
from pathlib import Path

# Local imports - our trusty client does the heavy lifting
from fetch_applications import IBMVerifyClient
from config import config

# Configure logging - keeping tabs on what's happening
# INFO level strikes the balance between silent and chatty
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Logger instance for this module
logger = logging.getLogger(__name__)


def fetch_federations(client):
    """Fetch all federation configurations with pagination support.
    
    We fetch a list of federations first, then get detailed config for each one.
    Two API calls per federation might seem excessive, but that's how the API
    is designed. We're not arguing with IBM's architectural choices today.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        
    Yields:
        dict: Federation data enriched with timestamp and metadata.
    """
    logger.info("Starting to fetch federations...")
    
    # Initialize pagination state
    offset = 0  # Where we start in the result set
    limit = config.DEFAULT_PAGE_SIZE  # How many per page
    total_fetched = 0  # Count for logging
    
    # Paginate through all federations
    while True:
        try:
            # Build pagination parameters
            params = {
                'limit': limit,  # Page size
                'offset': offset  # Starting index
            }
            
            logger.info(f"Fetching federations (offset={offset}, limit={limit})...")
            # Get this page of federations
            data = client._make_request(config.federations_url, params)
            
            # Extract federations array from response
            federations = data.get('federations', [])
            # Check if we got results
            if not federations:
                # No more data - we're done here
                logger.info("No more federations to fetch")
                break
            
            # Process each federation in this page
            for federation in federations:
                # Fetch detailed configuration for each federation
                federation_id = federation.get('id')
                # Only proceed if we have an ID
                if federation_id:
                    try:
                        # Build detail URL for this specific federation
                        detail_url = f"{config.federations_url}/{federation_id}"
                        # Fetch the full configuration
                        detail_data = client._make_request(detail_url)
                        
                        # Package with metadata
                        enriched_federation = {
                            'fetch_timestamp': datetime.utcnow().isoformat(),  # When
                            'federation_id': federation_id,  # Which one
                            'data': detail_data  # The details
                        }
                        # Yield this federation (generator pattern)
                        yield enriched_federation
                        # Increment success counter
                        total_fetched += 1
                    except Exception as e:
                        # Detail fetch failed - log warning and continue
                        logger.warning(f"Could not fetch details for federation {federation_id}: {e}")
            
            # Check if there are more pages
            total = data.get('total', 0)
            # If we've reached the end, stop
            if offset + limit >= total:
                break
            
            # Move to next page
            offset += limit
            
        except Exception as e:
            # Page fetch failed - log and stop
            logger.error(f"Error fetching federations at offset {offset}: {e}")
            break
    
    # Log final statistics
    logger.info(f"Successfully fetched {total_fetched} federations")


def main():
    """Main function to fetch federations and save to JSONL.
    
    Standard orchestration: validate, create paths, initialize client,
    fetch data, write to file. Rinse and repeat. At this point we could
    probably write this pattern in our sleep.
    """
    try:
        # Validate configuration (because we learn from our mistakes)
        config.validate()
        
        # Set up output directory
        output_dir = Path(config.OUTPUT_DIR)
        # Create if it doesn't exist (no drama if it does)
        output_dir.mkdir(exist_ok=True)
        
        # Build output file path
        output_file = output_dir / 'federations.jsonl'
        
        # Initialize API client
        client = IBMVerifyClient()
        
        # Fetch and write federations in streaming fashion
        # UTF-8 encoding because we're civilized people
        with open(output_file, 'w', encoding='utf-8') as f:
            # Stream federations to file as we fetch them
            for federation in fetch_federations(client):
                # Write each federation as a JSON line
                f.write(json.dumps(federation) + '\n')
        
        # Victory! Log the results
        logger.info(f"Federations saved to {output_file}")
        
    except Exception as e:
        # Something went wrong - log it
        logger.error(f"Failed to fetch federations: {e}")
        raise


# Standard Python entry point
if __name__ == '__main__':
    main()
