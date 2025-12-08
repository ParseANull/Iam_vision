"""Test various MFA endpoint paths to find the correct one."""
import argparse
from config import get_config
from fetch_applications import IBMVerifyClient

def test_endpoints(config):
    """Test different possible MFA endpoint paths."""
    client = IBMVerifyClient(config)
    
    # List of possible MFA endpoint paths to try
    endpoints = [
        '/v1.0/authnmethods',
        '/v2.0/authnmethods',
        '/v1.0/factors',
        '/v2.0/factors',
        '/v1.0/authenticators',
        '/v2.0/authenticators',
        '/config/v1.0/authenticators',
        '/config/v2.0/authenticators',
        '/v1.0/authentication/methods',
        '/v2.0/authentication/methods',
    ]
    
    print(f"Testing MFA endpoints for {config.TENANT_URL}\n")
    
    for endpoint in endpoints:
        url = config.TENANT_URL + endpoint
        try:
            result = client._make_request(url, {})
            if isinstance(result, list):
                print(f"✓ {endpoint}: SUCCESS - returned list with {len(result)} items")
            elif isinstance(result, dict):
                print(f"✓ {endpoint}: SUCCESS - returned dict with keys: {list(result.keys())}")
            else:
                print(f"? {endpoint}: UNEXPECTED - returned {type(result)}")
        except Exception as e:
            error_msg = str(e)
            if '404' in error_msg:
                print(f"✗ {endpoint}: 404 Not Found")
            elif '403' in error_msg:
                print(f"✗ {endpoint}: 403 Forbidden (exists but no permission)")
            else:
                print(f"✗ {endpoint}: {error_msg[:80]}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test MFA endpoint paths')
    parser.add_argument('--env', type=str, default='wiprt', help='Environment name')
    args = parser.parse_args()
    
    config = get_config(args.env)
    test_endpoints(config)
