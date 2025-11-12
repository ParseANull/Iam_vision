"""
Fetch detailed information for each application from IBM Security Verify API.
Reads application IDs from applications.jsonl and outputs to data/application_details.jsonl.
"""
import json
import logging
from datetime import datetime
from pathlib import Path

from fetch_applications import IBMVerifyClient
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_application_details(client, app_id):
    """
    Fetch detailed information for a specific application.
    
    Args:
        client: IBMVerifyClient instance
        app_id: Application ID
        
    Returns:
        dict: Detailed application data
    """
    try:
        url = f"{config.applications_url}/{app_id}"
        data = client._make_request(url)
        
        # Fetch additional details like entitlements
        entitlements_url = f"{url}/entitlements"
        try:
            entitlements = client._make_request(entitlements_url)
            data['entitlements'] = entitlements.get('entitlements', [])
        except Exception as e:
            logger.warning(f"Could not fetch entitlements for app {app_id}: {e}")
            data['entitlements'] = []
        
        # Fetch SSO configuration
        sso_url = f"{url}/sso"
        try:
            sso_config = client._make_request(sso_url)
            data['sso_configuration'] = sso_config
        except Exception as e:
            logger.warning(f"Could not fetch SSO config for app {app_id}: {e}")
            data['sso_configuration'] = {}
        
        return {
            'fetch_timestamp': datetime.utcnow().isoformat(),
            'application_id': app_id,
            'data': data
        }
        
    except Exception as e:
        logger.error(f"Error fetching details for application {app_id}: {e}")
        return None


def main():
    """Main function to fetch application details and save to JSONL."""
    try:
        # Validate configuration
        config.validate()
        
        output_dir = Path(config.OUTPUT_DIR)
        applications_file = output_dir / 'applications.jsonl'
        output_file = output_dir / 'application_details.jsonl'
        
        if not applications_file.exists():
            logger.error(f"Applications file not found: {applications_file}")
            logger.error("Please run fetch_applications.py first")
            return
        
        # Initialize client
        client = IBMVerifyClient()
        
        # Read application IDs
        app_ids = []
        with open(applications_file, 'r', encoding='utf-8') as f:
            for line in f:
                app_data = json.loads(line)
                app_id = app_data.get('data', {}).get('id')
                if app_id:
                    app_ids.append(app_id)
        
        logger.info(f"Found {len(app_ids)} applications to fetch details for")
        
        # Fetch and write application details
        successful = 0
        with open(output_file, 'w', encoding='utf-8') as f:
            for i, app_id in enumerate(app_ids, 1):
                logger.info(f"Fetching details for application {i}/{len(app_ids)}: {app_id}")
                details = fetch_application_details(client, app_id)
                if details:
                    f.write(json.dumps(details) + '\n')
                    successful += 1
        
        logger.info(f"Successfully fetched details for {successful}/{len(app_ids)} applications")
        logger.info(f"Details saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to fetch application details: {e}")
        raise


if __name__ == '__main__':
    main()
