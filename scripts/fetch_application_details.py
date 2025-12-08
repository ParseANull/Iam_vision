"""Fetch detailed information for each application from IBM Security Verify API.

This script does the second pass - taking the application IDs we found earlier
and fetching the juicy details for each one. We're talking entitlements, SSO
config, the whole enchilada. Think of it as going from the table of contents
to actually reading the chapters.

Reads application IDs from applications.jsonl and outputs to data/application_details.jsonl.
"""
# Standard library imports
import argparse
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

# Local imports - reusing our client from the applications script
from fetch_applications import IBMVerifyClient
from config import get_config

# Configure logging - keeping track of our progress
# INFO level gives us enough detail without being overwhelming
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Create logger instance for this module
logger = logging.getLogger(__name__)


def fetch_application_details(client, app_id):
    """Fetch detailed information for a specific application.
    
    We fetch the base application details plus supplementary info like
    entitlements and SSO configuration. If supplementary requests fail,
    we log a warning but keep going - partial data beats no data.
    
    Args:
        client (IBMVerifyClient): Authenticated API client instance.
        app_id (str): The unique application identifier.
        
    Returns:
        dict: Detailed application data with metadata, or None if fetch fails.
    """
    try:
        # Build URL for this specific application
        url = f"{config.applications_url}/{app_id}"
        # Fetch the main application details
        data = client._make_request(url)
        
        # Fetch additional details like entitlements (who can use this app)
        entitlements_url = f"{url}/entitlements"
        try:
            # Try to get entitlements data
            entitlements = client._make_request(entitlements_url)
            # Extract entitlements array and add to main data
            data['entitlements'] = entitlements.get('entitlements', [])
        except Exception as e:
            # Entitlements fetch failed - log warning and continue
            logger.warning(f"Could not fetch entitlements for app {app_id}: {e}")
            # Set empty array so downstream code doesn't break
            data['entitlements'] = []
        
        # Fetch SSO configuration (single sign-on settings)
        sso_url = f"{url}/sso"
        try:
            # Attempt to retrieve SSO config
            sso_config = client._make_request(sso_url)
            # Add SSO configuration to our data
            data['sso_configuration'] = sso_config
        except Exception as e:
            # SSO config fetch failed - log it and move on
            logger.warning(f"Could not fetch SSO config for app {app_id}: {e}")
            # Empty dict as fallback
            data['sso_configuration'] = {}
        
        # Package everything up with metadata
        return {
            'fetch_timestamp': datetime.now(timezone.utc).isoformat(),  # When we got it
            'application_id': app_id,  # Which app this is
            'data': data  # All the juicy details
        }
        
    except Exception as e:
        # Main fetch failed - this is more serious
        logger.error(f"Error fetching details for application {app_id}: {e}")
        # Return None to indicate failure
        return None


def main(config):
    """Main function to fetch application details and save to JSONL.
    
    This is the orchestration layer. We read application IDs from the
    applications.jsonl file, fetch detailed info for each one, and write
    the results to a new file. We track success/failure counts because
    APIs are fickle and some requests may fail.
    
    Args:
        config (Config): Configuration instance with credentials loaded.
    """
    try:
        # Validate configuration first (fail fast if something's wrong)
        config.validate()
        
        # Set up file paths using pathlib (works on Windows and Unix)
        output_dir = Path(config.OUTPUT_DIR)
        # Input file with application IDs
        applications_file = output_dir / 'applications.jsonl'
        # Output file for detailed application data
        output_file = output_dir / 'application_details.jsonl'
        
        # Check if input file exists before proceeding
        if not applications_file.exists():
            # Can't fetch details without IDs - bail out with helpful error
            logger.error(f"Applications file not found: {applications_file}")
            logger.error("Please run fetch_applications.py first")
            return
        
        # Initialize our API client (handles authentication)
        client = IBMVerifyClient(config)
        
        # Read application IDs from the input file
        # We create a list to hold all the IDs we find
        app_ids = []
        # Open input file and parse JSONL format
        with open(applications_file, 'r', encoding='utf-8') as f:
            # Process each line (each is a complete JSON object)
            for line in f:
                # Parse JSON from this line
                app_data = json.loads(line)
                # Extract application ID from nested structure
                app_id = app_data.get('data', {}).get('id')
                # Only add if we actually found an ID
                if app_id:
                    app_ids.append(app_id)
        
        # Log how many apps we'll be processing
        logger.info(f"Found {len(app_ids)} applications to fetch details for")
        
        # If no applications to process, exit early
        if len(app_ids) == 0:
            logger.info("No applications to fetch details for - exiting")
            logger.info(f"Details saved to {output_file}")
            return
        
        # Pre-authenticate the client before starting parallel workers
        # This prevents multiple threads from trying to get tokens simultaneously
        logger.info("Pre-authenticating client...")
        client._get_access_token()
        logger.info("Client authenticated successfully")
        
        # Fetch and write application details in parallel
        # We use ThreadPoolExecutor because the work is I/O-bound (waiting on API calls)
        # Track how many succeeded (some might fail)
        successful = 0
        # Use up to 10 concurrent workers (API rate limiting consideration)
        max_workers = 10
        
        logger.info(f"Fetching details for {len(app_ids)} applications using {max_workers} parallel workers")
        
        # Open output file in write mode
        with open(output_file, 'w', encoding='utf-8') as f:
            # Create a thread pool for parallel execution
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all fetch tasks to the executor
                # We create a dict to track which future corresponds to which app_id
                future_to_app_id = {
                    executor.submit(fetch_application_details, client, app_id): app_id
                    for app_id in app_ids
                }
                
                # Process results as they complete (not in submission order)
                for i, future in enumerate(as_completed(future_to_app_id), 1):
                    app_id = future_to_app_id[future]
                    try:
                        # Get the result from this completed future
                        details = future.result()
                        # Check if fetch succeeded
                        if details:
                            # Write this application's details as a JSON line
                            f.write(json.dumps(details) + '\n')
                            # Increment success counter
                            successful += 1
                        # Log progress every 10 apps or at the end
                        if i % 10 == 0 or i == len(app_ids):
                            logger.info(f"Progress: {i}/{len(app_ids)} applications processed ({successful} successful)")
                    except Exception as e:
                        logger.error(f"Error processing application {app_id}: {e}")
        
        # Log final statistics
        logger.info(f"Successfully fetched details for {successful}/{len(app_ids)} applications")
        logger.info(f"Details saved to {output_file}")
        
    except Exception as e:
        # Top-level error handler - log and re-raise
        logger.error(f"Failed to fetch application details: {e}")
        raise


# Standard Python entry point pattern
if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fetch application details from IBM Security Verify')
    parser.add_argument('--env', type=str, help='Environment name (e.g., bidevt, wiprt)')
    args = parser.parse_args()
    
    # Load config for the specified environment
    config = get_config(args.env)
    
    # Now run main with the loaded config
    main(config)
