"""
Fetch Identity Sources from IBM Security Verify

This script fetches identity source configurations including SAML federations,
LDAP/AD connectors, and other authentication sources.
"""

import argparse
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

# Local imports - leveraging our existing client
from fetch_applications import IBMVerifyClient
from config import get_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_identity_sources(client, config):
    """
    Fetch all identity sources from IBM Security Verify.
    
    Args:
        client: Authenticated API client instance
        config: Configuration object with environment settings
        
    Yields:
        dict: Identity source data enriched with fetch timestamp
    """
    logger.info("Starting to fetch identity sources...")
    
    try:
        # Make initial request
        response_data = client._make_request(config.identity_sources_url)
        
        if not response_data:
            logger.warning("No response data received")
            return
            
        # Extract identity sources from response
        if isinstance(response_data, dict):
            sources = response_data.get('identitySources', [])
            total = response_data.get('total', 0)
            
            logger.info(f"Found {total} identity sources")
            
            # Process each identity source
            for source in sources:
                enriched_source = {
                    'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                    'source_id': source.get('id'),
                    'instance_name': source.get('instanceName'),
                    'data': source
                }
                yield enriched_source
            
            # Handle pagination if present
            limit = response_data.get('limit', 100)
            page = response_data.get('page', 1)
            total_fetched = len(sources)
            
            # Fetch remaining pages if needed
            while total_fetched < total:
                page += 1
                params = {'limit': limit, 'page': page}
                logger.info(f"Fetching page {page}...")
                response_data = client._make_request(config.identity_sources_url, params)
                
                if response_data and 'identitySources' in response_data:
                    sources = response_data['identitySources']
                    if sources:
                        for source in sources:
                            enriched_source = {
                                'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                                'source_id': source.get('id'),
                                'instance_name': source.get('instanceName'),
                                'data': source
                            }
                            yield enriched_source
                        total_fetched += len(sources)
                        logger.info(f"Fetched page {page}, total so far: {total_fetched}")
                    else:
                        break
                else:
                    break
        else:
            logger.error(f"Unexpected response type: {type(response_data)}")
            
    except Exception as e:
        logger.error(f"Error fetching identity sources: {e}")
        raise


def save_to_jsonl(data: list, output_file: Path):
    """
    Save data to JSONL file.
    
    Args:
        data: List of dictionaries to save
        output_file: Path to output file
    """
    try:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in data:
                json.dump(item, f, ensure_ascii=False)
                f.write('\n')
        
        logger.info(f"Saved {len(data)} identity sources to {output_file}")
        
    except Exception as e:
        logger.error(f"Error saving to file: {e}")
        raise


def main():
    """Main execution function."""
    global config
    
    parser = argparse.ArgumentParser(
        description='Fetch identity sources from IBM Security Verify'
    )
    parser.add_argument(
        '--env',
        required=True,
        choices=['bidevt', 'widevt', 'biqat', 'wiqat', 'biprt', 'wiprt'],
        help='Environment to fetch from'
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize configuration
        config = get_config(args.env)
        
        # Create API client
        client = IBMVerifyClient(config)
        
        # Fetch identity sources
        logger.info(f"Fetching identity sources from {args.env}...")
        identity_sources = list(fetch_identity_sources(client, config))
        
        # Save to file
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / 'identity_sources.jsonl'
        save_to_jsonl(identity_sources, output_file)
        
        logger.info(f"Successfully fetched {len(identity_sources)} identity sources")
        
    except Exception as e:
        logger.error(f"Failed to fetch identity sources: {e}")
        import sys
        sys.exit(1)


if __name__ == "__main__":
    main()
