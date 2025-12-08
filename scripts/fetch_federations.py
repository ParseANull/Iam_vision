"""Fetch federation configurations from IBM Security Verify API.

Federations are how we connect with external identity providers - think
SAML, OAuth, that kind of party. We fetch the configurations so we know
who's invited to the identity provider dance and what the rules are.
Because nothing says "enterprise software" quite like federation configs.

Outputs data to data/federations.jsonl in JSONL format.
"""
# Standard library imports
import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Local imports - our trusty client does the heavy lifting
from fetch_applications import IBMVerifyClient
from config import get_config

# Configure logging - keeping tabs on what's happening
# INFO level strikes the balance between silent and chatty
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Logger instance for this module
logger = logging.getLogger(__name__)


def fetch_federations(client):
    """Fetch all federation configurations.
    
    The federations API returns a simple list of federation objects,
    not a paginated response. Each object contains the basic federation
    configuration - no need for secondary detail calls.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        
    Yields:
        dict: Federation data enriched with timestamp and metadata.
    """
    logger.info("Starting to fetch federations...")
    
    total_fetched = 0  # Count for logging
    
    try:
        logger.info("Fetching federations...")
        # Get all federations (no pagination parameters needed)
        data = client._make_request(config.federations_url, {})
        
        # API returns a list directly (not wrapped in an object)
        if isinstance(data, list):
            federations = data
        else:
            # Fallback in case response format changes
            federations = data.get('federations', [])
        
        logger.debug(f"Data type: {type(data)}")
        
        # Process each federation
        for federation in federations:
            # Package with metadata
            enriched_federation = {
                'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When we fetched it
                'federation_name': federation.get('name'),  # Federation identifier
                'data': federation  # The full configuration
            }
            # Yield this federation (generator pattern)
            yield enriched_federation
            # Increment success counter
            total_fetched += 1
        
    except Exception as e:
        # Fetch failed - log error
        logger.error(f"Error fetching federations: {e}")
    
    # Log final statistics
    logger.info(f"Successfully fetched {total_fetched} federations")


def main(config):
    """Main function to fetch federations and save to JSONL.
    
    Standard orchestration: validate, create paths, initialize client,
    fetch data, write to file. Rinse and repeat. At this point we could
    probably write this pattern in our sleep.
    
    Args:
        config (Config): Configuration instance with credentials loaded.
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
        client = IBMVerifyClient(config)
        
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
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fetch federations from IBM Security Verify')
    parser.add_argument('--env', type=str, help='Environment name (e.g., bidevt, wiprt)')
    args = parser.parse_args()
    
    # Load config for the specified environment
    config = get_config(args.env)
    
    # Now run main with the loaded config
    main(config)
