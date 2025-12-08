"""Fetch dynamic groups from IBM Security Verify API.

Dynamic groups in IBM Security Verify are groups with membership determined
by attribute-based rules rather than explicit assignments. These groups
automatically update their membership based on user attributes matching
defined criteria.

Note: This requires API client with ABAC (Attribute-Based Access Control)
entitlements to access the /abac/v1.0/dynamicgroups/ endpoint.

Outputs data to data/{env}/dynamic_groups.jsonl in JSONL format.
"""
# Standard library imports
import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Third-party imports
import requests

# Local imports
from fetch_applications import IBMVerifyClient
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_dynamic_groups(client, config):
    """Fetch all dynamic groups with pagination support.
    
    Dynamic groups are accessed via the ABAC (Attribute-Based Access Control)
    API endpoint which requires specific entitlements.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        
    Yields:
        dict: Dynamic group data enriched with fetch timestamp and metadata.
    """
    logger.info("Starting to fetch dynamic groups...")
    
    # Standard JSON headers for ABAC endpoint
    headers = {
        'Authorization': f'Bearer {client._get_access_token()}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    # Construct the dynamic groups URL - redirects to /abac/v1.0/dynamicgroups/
    dynamic_groups_url = f"{config.TENANT_URL}/v1.0/dynamicgroups"
    
    # Initialize pagination variables
    offset = 0
    limit = config.DEFAULT_PAGE_SIZE
    total_fetched = 0
    
    # Loop until we've fetched all pages
    while True:
        try:
            # Build query parameters for pagination
            params = {
                'limit': limit,
                'offset': offset
            }
            
            logger.info(f"Fetching dynamic groups (offset={offset}, limit={limit})...")
            
            # Make API request
            response = requests.get(
                dynamic_groups_url,
                headers=headers,
                params=params,
                timeout=config.REQUEST_TIMEOUT,
                allow_redirects=True
            )
            
            # Check for authorization errors
            if response.status_code == 401:
                logger.error("Unauthorized: API client does not have ABAC entitlements for dynamic groups")
                raise PermissionError(
                    "API client requires ABAC entitlements to access dynamic groups. "
                    "Contact your IBM Security Verify administrator to grant the necessary permissions."
                )
            
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            
            # Extract dynamic groups array
            if isinstance(data, list):
                groups = data
            else:
                groups = data.get('dynamicGroups', data.get('groups', []))
            
            # Check if we got any results
            if not groups:
                logger.info("No more dynamic groups to fetch")
                break
            
            # Process each group in this page
            for group in groups:
                # Enrich with metadata
                enriched_group = {
                    'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                    'group_id': group.get('id', group.get('groupId')),
                    'group_name': group.get('name', group.get('displayName')),
                    'data': group
                }
                yield enriched_group
                total_fetched += 1
            
            # Check if there are more pages
            if isinstance(data, list):
                break
            total = data.get('total', 0)
            if total == 0 or offset + limit >= total:
                break
            
            # Move to next page
            offset += limit
            
        except PermissionError:
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching dynamic groups at offset {offset}: {e}")
            raise
    
    logger.info(f"Finished fetching {total_fetched} dynamic groups")


def save_to_jsonl(data, output_file):
    """Save data to JSONL file.
    
    Args:
        data (list): List of dictionaries to save.
        output_file (Path): Path object for output file.
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item) + '\n')
    logger.info(f"Saved {len(data)} dynamic groups to {output_file}")


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Fetch dynamic groups from IBM Security Verify'
    )
    parser.add_argument(
        '--env',
        required=True,
        help='Environment name (e.g., bidevt, wiprt, biqat)'
    )
    args = parser.parse_args()
    
    logger.info(f"Fetching dynamic groups from {args.env}...")
    
    # Initialize configuration for specified environment
    config = Config(args.env)
    config.validate()
    
    # Initialize API client
    client = IBMVerifyClient(config)
    
    # Prepare output directory
    output_dir = Path(config.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / 'dynamic_groups.jsonl'
    
    try:
        # Fetch and collect all dynamic groups
        groups = list(fetch_dynamic_groups(client, config))
        
        # Save to file
        save_to_jsonl(groups, output_file)
        
        logger.info(f"Successfully fetched {len(groups)} dynamic groups from {args.env}")
    
    except PermissionError as e:
        logger.error(f"Permission error: {e}")
        logger.info("Dynamic groups feature requires ABAC entitlements on the API client")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
