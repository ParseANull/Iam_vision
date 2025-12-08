"""Fetch MFA configurations and policies from IBM Security Verify API.

Multi-Factor Authentication configs tell us what extra verification methods
are available - TOTP tokens, SMS codes, biometrics, etc. We're very careful
here to only fetch configuration metadata, not actual secrets. Think of it
as reading the menu, not stealing someone's dinner.

Outputs data to data/mfa_configurations.jsonl in JSONL format.

SECURITY NOTE: This script fetches MFA method metadata (types, names, status)
only. It does NOT fetch or store actual secrets, passwords, or authentication
tokens. The data includes configuration information like "TOTP", "SMS", 
"Email", which are method types, not sensitive credentials.
"""
# Standard library imports
import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Local imports - our battle-tested client
from fetch_applications import IBMVerifyClient
from config import get_config

# Configure logging - because debugging blind is no fun
# INFO level: enough to know what's happening, not drowning in detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Logger instance for this module
logger = logging.getLogger(__name__)


def sanitize_mfa_data(data):
    """Remove any potentially sensitive fields from MFA data.
    
    We're paranoid (in a healthy way) about storing MFA data. This function
    strips everything except safe metadata fields. If it's not on the whitelist,
    it doesn't make it into our output. Better safe than explaining to security
    why we stored sensitive auth data in plain text.
    
    Args:
        data (dict or other): MFA method data to sanitize.
        
    Returns:
        dict: Sanitized MFA data containing only safe metadata fields.
    """
    # Fields that are safe to store (method metadata only)
    # This whitelist approach means we explicitly choose what to keep
    safe_fields = ['id', 'type', 'method', 'name', 'enabled', 'status', 'protocol']
    
    # Only process if we got a dictionary
    if not isinstance(data, dict):
        return {}
    
    # Build sanitized dictionary with only safe fields
    return {key: data[key] for key in safe_fields if key in data}


def fetch_mfa_configurations(client):
    """Fetch all MFA configurations with pagination support.
    
    We paginate through MFA methods and sanitize all data before yielding.
    For each method, we try to fetch detailed config, but if that fails we
    still return the basic sanitized data. Every piece of data gets run
    through our sanitization filter - trust no one, sanitize everything.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        
    Yields:
        dict: Sanitized MFA configuration data with metadata.
    """
    logger.info("Starting to fetch MFA configurations...")
    
    # Initialize pagination variables
    offset = 0  # Starting position
    limit = config.DEFAULT_PAGE_SIZE  # Items per request
    total_fetched = 0  # Running count
    
    # Paginate through all MFA methods
    while True:
        try:
            # Build pagination parameters
            params = {
                'limit': limit,  # Page size
                'offset': offset  # Start position
            }
            
            logger.info(f"Fetching MFA configs (offset={offset}, limit={limit})...")
            # Fetch this page of MFA authenticators
            data = client._make_request(config.mfa_url, params)
            
            # The v1.0/authenticators endpoint uses 'authenticators' key
            mfa_methods = data.get('authenticators', [])
            # Check if we got any results
            if not mfa_methods:
                # No more methods - we're done
                logger.info("No more MFA configurations to fetch")
                break
            
            # Process each MFA method in this page
            for method in mfa_methods:
                # Fetch detailed configuration for each method
                method_id = method.get('id')
                # Only proceed if we have an ID
                if method_id:
                    try:
                        # Build detail URL for this specific method
                        detail_url = f"{config.mfa_url}/{method_id}"
                        # Fetch the full configuration
                        detail_data = client._make_request(detail_url)
                        
                        # Sanitize data to remove any potential secrets
                        # We're extra cautious with MFA data
                        enriched_method = {
                            'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When
                            'method_id': method_id,  # Which method
                            'data': sanitize_mfa_data(detail_data)  # Sanitized data
                        }
                        # Yield this method (generator pattern)
                        yield enriched_method
                        # Increment counter
                        total_fetched += 1
                    except Exception as e:
                        # Detail fetch failed - log error type only (not full details)
                        # We're careful not to log potentially sensitive info
                        logger.warning(f"Could not fetch details for MFA method {method_id}: {type(e).__name__}")
                        # Still yield basic data (sanitized, method type/name only)
                        # Partial data is better than no data
                        enriched_method = {
                            'fetch_timestamp': datetime.now(timezone.utc).isoformat(),
                            'method_id': method_id,
                            'data': sanitize_mfa_data(method)  # Fallback to basic data
                        }
                        yield enriched_method
                        total_fetched += 1
            
            # Check if there are more pages
            total = data.get('total', 0)
            # Stop if we've fetched everything
            if total == 0 or offset + limit >= total:
                break
            
            # Move to next page
            offset += limit
            
        except Exception as e:
            # Page fetch failed - log and stop
            logger.error(f"Error fetching MFA configurations at offset {offset}: {e}")
            break
    
    # Log final statistics
    logger.info(f"Successfully fetched {total_fetched} MFA configurations")


def main(config):
    """Main function to fetch MFA configurations and save to JSONL.
    
    Our standard orchestration pattern, but with extra paranoia because
    we're dealing with MFA configs. We validate, initialize, fetch, and
    write - all while keeping security front of mind. All data gets
    sanitized before it hits the disk.
    
    Args:
        config (Config): Configuration instance with credentials loaded.
    """
    try:
        # Validate configuration (always the first step)
        config.validate()
        
        # Set up output directory
        output_dir = Path(config.OUTPUT_DIR)
        # Create if needed (no error if already exists)
        output_dir.mkdir(exist_ok=True)
        
        # Build output file path
        output_file = output_dir / 'mfa_configurations.jsonl'
        
        # Initialize API client
        client = IBMVerifyClient(config)
        
        # Fetch and write MFA configurations
        # Important: Only method types and metadata are stored, not actual secrets
        # We sanitize everything before writing to disk
        with open(output_file, 'w', encoding='utf-8') as f:
            # Stream MFA configs to file as we fetch them
            for mfa_config in fetch_mfa_configurations(client):
                # Write each config as a JSON line
                f.write(json.dumps(mfa_config) + '\n')
        
        # Success! Log where we saved the sanitized data
        logger.info(f"MFA configurations saved to {output_file}")
        
    except Exception as e:
        # Top-level error handler
        logger.error(f"Failed to fetch MFA configurations: {e}")
        raise


# Standard Python entry point
if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fetch MFA configurations from IBM Security Verify')
    parser.add_argument('--env', type=str, help='Environment name (e.g., bidevt, wiprt)')
    args = parser.parse_args()
    
    # Load config for the specified environment
    config = get_config(args.env)
    
    # Now run main with the loaded config
    main(config)
