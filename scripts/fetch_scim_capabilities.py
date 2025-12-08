"""Fetch SCIM capabilities from IBM Security Verify API.

SCIM capabilities define the service provider's supported features and 
limitations for SCIM protocol operations. This includes information about
bulk operations, filtering, sorting, change password support, and other
SCIM-specific features.

Outputs data to data/{env}/scim_capabilities.jsonl in JSONL format.
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


def fetch_scim_capabilities(client, config):
    """Fetch SCIM capabilities from the service provider.
    
    The capabilities endpoint returns information about what SCIM features
    are supported by the IBM Security Verify instance, including bulk operations,
    filtering capabilities, sorting, pagination, and other SCIM protocol features.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        
    Returns:
        dict: SCIM capabilities data enriched with fetch timestamp.
    """
    logger.info("Fetching SCIM capabilities...")
    
    # SCIM capabilities endpoint requires SCIM headers
    headers = {
        'Authorization': f'Bearer {client._get_access_token()}',
        'Accept': 'application/scim+json',
        'Content-Type': 'application/scim+json'
    }
    
    # Construct the capabilities URL
    capabilities_url = f"{config.TENANT_URL}/v2.0/SCIM/capabilities"
    
    try:
        # Make API request for capabilities
        response = requests.get(capabilities_url, headers=headers, timeout=config.REQUEST_TIMEOUT)
        response.raise_for_status()
        
        # Parse response
        capabilities = response.json()
        
        # Enrich with metadata
        enriched_capabilities = {
            'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
            'endpoint': '/v2.0/SCIM/capabilities',
            'tenant_url': config.TENANT_URL,
            'data': capabilities
        }
        
        logger.info("Successfully fetched SCIM capabilities")
        return enriched_capabilities
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching SCIM capabilities: {e}")
        raise


def save_to_jsonl(data, output_file):
    """Save data to JSONL file.
    
    Args:
        data (dict): Dictionary to save.
        output_file (Path): Path object for output file.
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write as a single JSON line
        f.write(json.dumps(data) + '\n')
    logger.info(f"Saved SCIM capabilities to {output_file}")


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Fetch SCIM capabilities from IBM Security Verify'
    )
    parser.add_argument(
        '--env',
        required=True,
        help='Environment name (e.g., bidevt, wiprt, biqat)'
    )
    args = parser.parse_args()
    
    logger.info(f"Fetching SCIM capabilities from {args.env}...")
    
    # Initialize configuration for specified environment
    config = Config(args.env)
    config.validate()
    
    # Initialize API client
    client = IBMVerifyClient(config)
    
    # Prepare output directory
    output_dir = Path(config.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / 'scim_capabilities.jsonl'
    
    # Fetch SCIM capabilities
    capabilities = fetch_scim_capabilities(client, config)
    
    # Save to file
    save_to_jsonl(capabilities, output_file)
    
    logger.info(f"Successfully fetched SCIM capabilities from {args.env}")


if __name__ == "__main__":
    main()
