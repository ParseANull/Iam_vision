"""Fetch detailed information for dynamic groups from IBM Security Verify API.

This script reads the dynamic_groups.jsonl file and fetches detailed information
for each dynamic group, including:
- Full group configuration
- Membership rules and conditions
- Attribute-based access control (ABAC) policy details
- Current member count and status

Note: Requires API client with ABAC entitlements to access dynamic group details.

Outputs data to data/{env}/dynamic_groups_detail.jsonl in JSONL format.
"""
# Standard library imports
import argparse
import json
import logging
import time
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


def load_dynamic_groups(input_file):
    """Load dynamic groups from JSONL file.
    
    Args:
        input_file (Path): Path to dynamic_groups.jsonl file.
        
    Returns:
        list: List of dynamic group dictionaries.
        
    Raises:
        FileNotFoundError: If input file doesn't exist.
    """
    if not input_file.exists():
        raise FileNotFoundError(
            f"Dynamic groups file not found: {input_file}. "
            "Please run fetch_dynamic_groups.py first."
        )
    
    groups = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                groups.append(json.loads(line))
    
    logger.info(f"Loaded {len(groups)} dynamic groups from {input_file}")
    return groups


def fetch_dynamic_group_detail(client, config, group_id):
    """Fetch detailed information for a specific dynamic group.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        group_id (str): The ID of the dynamic group to fetch details for.
        
    Returns:
        dict: Detailed dynamic group information.
        
    Raises:
        PermissionError: If API client lacks ABAC entitlements.
        requests.exceptions.RequestException: If API request fails.
    """
    headers = {
        'Authorization': f'Bearer {client._get_access_token()}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    # Construct detail URL - ABAC endpoint for specific group
    detail_url = f"{config.TENANT_URL}/v1.0/dynamicgroups/{group_id}"
    
    logger.debug(f"Fetching details for group {group_id}...")
    
    try:
        response = requests.get(
            detail_url,
            headers=headers,
            timeout=config.REQUEST_TIMEOUT,
            allow_redirects=True
        )
        
        # Check for authorization errors
        if response.status_code == 401:
            raise PermissionError(
                "API client requires ABAC entitlements to access dynamic group details. "
                "Contact your IBM Security Verify administrator to grant the necessary permissions."
            )
        
        # Handle 404 - group may have been deleted
        if response.status_code == 404:
            logger.warning(f"Dynamic group {group_id} not found (may have been deleted)")
            return None
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching details for group {group_id}: {e}")
        raise


def fetch_all_details(client, config, groups):
    """Fetch detailed information for all dynamic groups.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        groups (list): List of dynamic groups from fetch_dynamic_groups.
        
    Yields:
        dict: Detailed group information enriched with metadata.
    """
    total = len(groups)
    logger.info(f"Fetching details for {total} dynamic groups...")
    
    for index, group in enumerate(groups, 1):
        group_id = group.get('group_id')
        group_name = group.get('group_name', 'Unknown')
        
        if not group_id:
            logger.warning(f"Skipping group without ID: {group_name}")
            continue
        
        try:
            logger.info(f"[{index}/{total}] Fetching details for: {group_name} ({group_id})")
            
            # Fetch detailed information
            detail = fetch_dynamic_group_detail(client, config, group_id)
            
            if detail:
                # Enrich with metadata
                enriched_detail = {
                    'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                    'group_id': group_id,
                    'group_name': group_name,
                    'detail': detail
                }
                yield enriched_detail
            
            # Rate limiting - be nice to the API
            if index < total:
                time.sleep(config.RATE_LIMIT_DELAY)
                
        except PermissionError:
            # Re-raise permission errors immediately
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch details for {group_name} ({group_id}): {e}")
            # Continue with next group instead of failing entirely
            continue
    
    logger.info(f"Finished fetching details for dynamic groups")


def save_to_jsonl(data, output_file):
    """Save data to JSONL file.
    
    Args:
        data (list): List of dictionaries to save.
        output_file (Path): Path object for output file.
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item) + '\n')
    logger.info(f"Saved {len(data)} dynamic group details to {output_file}")


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Fetch detailed information for dynamic groups from IBM Security Verify'
    )
    parser.add_argument(
        '--env',
        required=True,
        help='Environment name (e.g., bidevt, wiprt, biqat)'
    )
    args = parser.parse_args()
    
    logger.info(f"Fetching dynamic group details from {args.env}...")
    
    # Initialize configuration for specified environment
    config = Config(args.env)
    config.validate()
    
    # Initialize API client
    client = IBMVerifyClient(config)
    
    # Prepare paths
    output_dir = Path(config.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    input_file = output_dir / 'dynamic_groups.jsonl'
    output_file = output_dir / 'dynamic_groups_detail.jsonl'
    
    try:
        # Load dynamic groups from previous fetch
        groups = load_dynamic_groups(input_file)
        
        if not groups:
            logger.warning(f"No dynamic groups found in {input_file}")
            logger.info("Run fetch_dynamic_groups.py first to collect group IDs")
            return 1
        
        # Fetch and collect all details
        details = list(fetch_all_details(client, config, groups))
        
        # Save to file
        save_to_jsonl(details, output_file)
        
        logger.info(f"Successfully fetched details for {len(details)} dynamic groups from {args.env}")
        
        # Report any groups that failed
        failed = len(groups) - len(details)
        if failed > 0:
            logger.warning(f"{failed} groups failed to fetch or were not found")
    
    except FileNotFoundError as e:
        logger.error(f"Input file error: {e}")
        return 1
    
    except PermissionError as e:
        logger.error(f"Permission error: {e}")
        logger.info("Dynamic groups detail feature requires ABAC entitlements on the API client")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
