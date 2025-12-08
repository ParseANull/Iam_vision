"""Test script to discover IBM Security Verify API endpoints for additional objects."""
import argparse
from config import get_config
from fetch_applications import IBMVerifyClient

def test_endpoints(config):
    """Test various endpoint paths to find the correct ones."""
    client = IBMVerifyClient(config)
    
    # Endpoints to test for each object type
    test_cases = {
        'Roles': [
            '/v1.0/roles',
            '/v2.0/roles',
            '/v1.0/access/roles',
            '/v2.0/access/roles',
        ],
        'Access Policies': [
            '/v1.0/policies',
            '/v2.0/policies',
            '/v1.0/access/policies',
            '/v2.0/access/policies',
            '/v1.0/authnpolicies',
            '/v2.0/authnpolicies',
        ],
        'Identity Sources': [
            '/v1.0/identitysources',
            '/v2.0/identitysources',
            '/v1.0/identity-sources',
            '/v2.0/identity-sources',
            '/v1.0/connectors',
            '/v2.0/connectors',
        ],
        'API Clients': [
            '/v1.0/apiclients',
            '/v2.0/apiclients',
            '/v1.0/clients',
            '/v2.0/clients',
            '/v1.0/oauth/clients',
            '/v2.0/oauth/clients',
        ],
        'Themes/Branding': [
            '/v1.0/themes',
            '/v2.0/themes',
            '/v1.0/branding',
            '/v2.0/branding',
            '/v1.0/config/branding',
            '/v2.0/config/branding',
        ],
        'Entitlements': [
            '/v1.0/entitlements',
            '/v2.0/entitlements',
            '/v1.0/access/entitlements',
            '/v2.0/access/entitlements',
        ],
        'Authentication Methods': [
            '/v1.0/config/authn',
            '/v2.0/config/authn',
            '/v1.0/authentication/config',
            '/v2.0/authentication/config',
            '/v1.0/authnmethods/config',
            '/v2.0/authnmethods/config',
        ],
    }
    
    print(f"Testing additional object endpoints for {config.TENANT_URL}\n")
    print("=" * 80)
    
    for object_type, endpoints in test_cases.items():
        print(f"\n{object_type}:")
        print("-" * 80)
        
        for endpoint in endpoints:
            url = config.TENANT_URL + endpoint
            try:
                result = client._make_request(url, {})
                if isinstance(result, list):
                    print(f"  ✓ {endpoint}: SUCCESS - list with {len(result)} items")
                elif isinstance(result, dict):
                    keys = list(result.keys())
                    total = result.get('total', result.get('totalResults', '?'))
                    print(f"  ✓ {endpoint}: SUCCESS - dict, total={total}, keys={keys[:5]}")
                else:
                    print(f"  ? {endpoint}: UNEXPECTED - {type(result)}")
            except Exception as e:
                error_msg = str(e)
                if '404' in error_msg:
                    print(f"  ✗ {endpoint}: 404 Not Found")
                elif '403' in error_msg:
                    print(f"  ✗ {endpoint}: 403 Forbidden")
                else:
                    print(f"  ✗ {endpoint}: {error_msg[:60]}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test additional object endpoints')
    parser.add_argument('--env', type=str, default='wiprt', help='Environment name')
    args = parser.parse_args()
    
    config = get_config(args.env)
    test_endpoints(config)
