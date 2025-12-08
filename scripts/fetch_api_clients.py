"""
Fetch API Clients from IBM Security Verify

This script fetches API client configurations including OAuth/OIDC clients
used for API access and application integrations.
"""

import argparse
import json
import logging
import sys
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


def fetch_api_clients(client, config):
    """
    Fetch all API clients from IBM Security Verify.
    
    Args:
        client: Authenticated API client instance
        config: Configuration object with environment settings
        
    Yields:
        dict: API client data enriched with fetch timestamp
    """
    logger.info("Starting to fetch API clients...")
    
    try:
        # Make initial request
        response_data = client._make_request(config.api_clients_url)
        
        if not response_data:
            logger.warning("No response data received")
            return
            
        # Extract API clients from response
        if isinstance(response_data, dict):
            clients = response_data.get('apiClients', [])
            total = response_data.get('total', 0)
            
            logger.info(f"Found {total} API clients")
            
            # Process each API client
            for api_client in clients:
                enriched_client = {
                    'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                    'client_id': api_client.get('id'),
                    'client_name': api_client.get('clientName'),
                    'data': api_client
                }
                yield enriched_client
            
            # Handle pagination if present
            limit = response_data.get('limit', 200)
            page = response_data.get('page', 1)
            total_fetched = len(clients)
            
            # Fetch remaining pages if needed
            while total_fetched < total:
                page += 1
                params = {'limit': limit, 'page': page}
                logger.info(f"Fetching page {page}...")
                response_data = client._make_request(config.api_clients_url, params)
                
                if response_data and 'apiClients' in response_data:
                    clients = response_data['apiClients']
                    if clients:
                        for api_client in clients:
                            enriched_client = {
                                'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                                'client_id': api_client.get('id'),
                                'client_name': api_client.get('clientName'),
                                'data': api_client
                            }
                            yield enriched_client
                        total_fetched += len(clients)
                        logger.info(f"Fetched page {page}, total so far: {total_fetched}")
                    else:
                        break
                else:
                    break
        else:
            logger.error(f"Unexpected response type: {type(response_data)}")
            
    except Exception as e:
        logger.error(f"Error fetching API clients: {e}")
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
        
        logger.info(f"Saved {len(data)} API clients to {output_file}")
        
    except Exception as e:
        logger.error(f"Error saving to file: {e}")
        raise


def main():
    """Main execution function."""
    global config
    
    parser = argparse.ArgumentParser(
        description='Fetch API clients from IBM Security Verify'
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
        
        # Fetch API clients
        logger.info(f"Fetching API clients from {args.env}...")
        api_clients = list(fetch_api_clients(client, config))
        
        # Save to file
        output_dir = Path(config.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / 'api_clients.jsonl'
        save_to_jsonl(api_clients, output_file)
        
        logger.info(f"Successfully fetched {len(api_clients)} API clients")
        
    except Exception as e:
        logger.error(f"Failed to fetch API clients: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
