"""Fetch groups from IBM Security Verify API.

Groups are collections of users - think departments, teams, access levels,
that sort of thing. We fetch group metadata so we know what groups exist
and who belongs where. It's like getting the org chart, except hopefully
more accurate than the one on the company intranet.

Outputs data to data/groups.jsonl in JSONL format.
"""
# Standard library imports
import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Local imports - leveraging our existing client
from fetch_applications import IBMVerifyClient
from config import get_config

# Configure logging - breadcrumbs for troubleshooting
# INFO level: chatty enough to know what's happening, not overwhelming
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Logger instance for this module
logger = logging.getLogger(__name__)


def fetch_groups(client, config):
    """Fetch all groups with pagination support.
    
    We paginate through groups because there could be many of them.
    This is a generator that yields groups one at a time for memory efficiency.
    The API response structure might vary, so we check for common field names.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        
    Yields:
        dict: Group data enriched with fetch timestamp and metadata.
    """
    logger.info("Starting to fetch groups...")
    
    # Initialize pagination variables
    # Groups API v2.0 uses SCIM parameters: startIndex (1-based) and count
    start_index = 1  # SCIM uses 1-based indexing
    count = config.DEFAULT_PAGE_SIZE  # How many to fetch per request
    total_fetched = 0  # Running count for logging
    
    # Loop until we've fetched all pages
    while True:
        try:
            # Build query parameters for SCIM pagination
            params = {
                'count': count,  # Page size (SCIM parameter)
                'startIndex': start_index  # Starting position (SCIM 1-based index)
            }
            
            logger.info(f"Fetching groups (startIndex={start_index}, count={count})...")
            # Make API request for this page - Groups API uses SCIM format
            # We need to override the Accept header to use application/scim+json
            data = client._make_scim_request(config.groups_url, params)
            
            # Debug: log what we received
            logger.debug(f"Data type: {type(data)}")
            if isinstance(data, dict):
                logger.debug(f"Data keys: {list(data.keys())}")
                logger.debug(f"Data content (first 500 chars): {str(data)[:500]}")
            else:
                logger.debug(f"Data content (first 500 chars): {str(data)[:500]}")
            
            # Extract groups array - API might use different field names
            # Sometimes it's wrapped in an object, sometimes it's a direct list
            if isinstance(data, list):
                groups = data
            else:
                groups = data.get('groups', data.get('Groups', data.get('Resources', [])))
            
            # Check if we got any results
            if not groups:
                # Empty result means we're done
                logger.info("No more groups to fetch")
                break
            
            # Process each group in this page
            for group in groups:
                # Enrich with metadata
                enriched_group = {
                    'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When fetched
                    'group_id': group.get('id', group.get('groupId')),  # ID
                    'data': group  # The actual group data
                }
                # Yield this group (generator pattern)
                yield enriched_group
                # Increment counter
                total_fetched += 1
            
            # Check if there are more pages
            # If data is a list, we got all results in one shot
            if isinstance(data, list):
                break
            
            # SCIM response uses totalResults field
            total_results = data.get('totalResults', 0)
            # If totalResults is 0 or we've fetched everything, stop
            if total_results == 0 or start_index + count - 1 >= total_results:
                break
            
            # Move to next page (SCIM uses 1-based indexing)
            start_index += count
            
        except Exception as e:
            # Error fetching this page - log and stop
            logger.error(f"Error fetching groups at startIndex {start_index}: {e}")
            break
    
    # Log final count
    logger.info(f"Successfully fetched {total_fetched} groups")


def main(config):
    """Main function to fetch groups and save to JSONL.
    
    We orchestrate the whole process: validate config, create output directory,
    initialize the client, fetch groups, and write them to a file.
    Using a generator means we stream data to disk instead of loading
    everything into memory (which would be a bad time with large datasets).
    
    Args:
        config (Config): Configuration instance with credentials loaded.
    """
    try:
        # Validate configuration (fail fast with clear errors)
        config.validate()
        
        # Set up output directory using pathlib
        output_dir = Path(config.OUTPUT_DIR)
        # Create directory if needed (exist_ok prevents errors if already there)
        output_dir.mkdir(exist_ok=True)
        
        # Build output file path
        output_file = output_dir / 'groups.jsonl'
        
        # Initialize API client (handles authentication)
        client = IBMVerifyClient(config)
        
        # Fetch and write groups in streaming fashion
        # Open file in write mode with UTF-8 encoding
        with open(output_file, 'w', encoding='utf-8') as f:
            # Iterate through groups as they're fetched
            for group in fetch_groups(client, config):
                # Write each group as a JSON line
                f.write(json.dumps(group) + '\n')
        
        # Success! Log where we saved the data
        logger.info(f"Groups saved to {output_file}")
        
    except Exception as e:
        # Top-level error handler
        logger.error(f"Failed to fetch groups: {e}")
        raise


if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fetch groups from IBM Security Verify')
    parser.add_argument('--env', type=str, help='Environment name (e.g., bidevt, wiprt)')
    args = parser.parse_args()
    
    # Load config for the specified environment
    config = get_config(args.env)
    
    # Now run main with the loaded config
    main(config)
