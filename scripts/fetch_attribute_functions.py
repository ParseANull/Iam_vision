"""Fetch attribute functions from IBM Security Verify API.

Attribute functions are custom logic or transformations that can be applied
to user attributes. This includes data mappings, attribute rules, and other
functions configured for the tenant.

Outputs data to data/{env}/attribute_functions.jsonl in JSONL format.
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


def fetch_attribute_functions(client, config):
    """Fetch all attribute functions.
    
    Attribute functions endpoint returns a list of configured functions
    for the tenant. Unlike some other endpoints, this typically returns
    all results in a single response without pagination.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        config (Config): Configuration instance with settings.
        
    Yields:
        dict: Attribute function data enriched with fetch timestamp and metadata.
    """
    logger.info("Starting to fetch attribute functions...")
    
    total_fetched = 0  # Running count for logging
    
    try:
        # Build the attribute functions URL
        # Per IBM Verify API docs: GET /v1.0/attributefunctions
        url = f"{config.TENANT_URL}/v1.0/attributefunctions"
        
        logger.info("Fetching attribute functions...")
        # Make API request
        data = client._make_request(url)
        
        # Debug: log what we received
        logger.debug(f"Data type: {type(data)}")
        if isinstance(data, dict):
            logger.debug(f"Data keys: {list(data.keys())}")
        
        # Extract attribute functions array
        # API might return a direct list or wrapped in an object
        if isinstance(data, list):
            functions = data
        else:
            # Check common field names
            functions = data.get('attributeFunctions', data.get('functions', []))
        
        # Check if we got any results
        if not functions:
            logger.info("No attribute functions found")
            return
        
        # Process each function
        for func in functions:
            # Enrich with metadata
            enriched_func = {
                'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When fetched
                'function_id': func.get('id', func.get('functionId')),  # ID
                'data': func  # The actual function data
            }
            # Yield this function (generator pattern)
            yield enriched_func
            # Increment counter
            total_fetched += 1
        
    except Exception as e:
        # Error fetching - log and stop
        logger.error(f"Error fetching attribute functions: {e}")
        raise
    
    # Log final count
    logger.info(f"Successfully fetched {total_fetched} attribute functions")


def save_to_jsonl(data_generator, output_file):
    """Save data to JSONL (JSON Lines) file.
    
    We write one JSON object per line, which is great for streaming large
    datasets and processing them line by line later. It's the kind of format
    that makes data engineers smile.
    
    Args:
        data_generator: Generator yielding dictionaries to save.
        output_file (Path): Path to the output file.
    """
    # Ensure output directory exists (create if needed)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Open file in write mode and save each item as a line
    with open(output_file, 'w', encoding='utf-8') as f:
        count = 0
        for item in data_generator:
            # Write JSON line (compact, no pretty printing)
            json.dump(item, f)
            # Add newline to separate records
            f.write('\n')
            count += 1
    
    logger.info(f"Attribute functions saved to {output_file}")
    return count


def main(config):
    """Main orchestration function.
    
    This is where the magic happens - or at least where we coordinate
    all the pieces that make the magic happen. We're more stage manager
    than magician, really.
    
    Args:
        config (Config): Configuration instance with environment-specific settings.
    """
    # Create API client instance with our config
    client = IBMVerifyClient(config)
    
    # Determine output file path
    # OUTPUT_DIR from config already includes environment-specific path
    output_dir = Path(config.OUTPUT_DIR)
    output_file = output_dir / 'attribute_functions.jsonl'
    
    # Fetch and save attribute functions
    functions_generator = fetch_attribute_functions(client, config)
    count = save_to_jsonl(functions_generator, output_file)
    
    logger.info(f"Fetching complete. Total attribute functions: {count}")


if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Fetch attribute functions from IBM Security Verify API'
    )
    parser.add_argument(
        '--env',
        type=str,
        required=True,
        help='Environment name (e.g., bidevt, wiprt, biqat, wiqat, biprt)'
    )
    args = parser.parse_args()
    
    # Load configuration for specified environment
    config = get_config(args.env)
    
    # Validate configuration before proceeding
    if not config.validate():
        logger.error("Configuration validation failed. Check your environment variables.")
        exit(1)
    
    # Run the main function
    main(config)
