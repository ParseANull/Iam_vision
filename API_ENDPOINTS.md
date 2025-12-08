# IBM Security Verify API Endpoints

This document describes the correct API endpoint versions for each object type based on IBM Security Verify documentation.

## Summary

| Object Type | API Version | Endpoint Path | Parameters | Accept Header |
|------------|-------------|---------------|------------|---------------|
| Applications | v1.0 | `/v1.0/applications` | `limit`, `offset` | `application/json` |
| Application Details | v1.0 | `/v1.0/applications/{id}` | N/A | `application/json` |
| Attributes | v1.0 | `/v1.0/attributes` | `limit`, `offset` | `application/json` |
| Attribute Functions | v1.0 | `/v1.0/attributefunctions` | N/A | `application/json` |
| Federations | v1.0 | `/v1.0/saml/federations` | N/A | `application/json` |
| MFA Authenticators | v1.0 | `/v1.0/authenticators` | `limit`, `page` | `application/json` |
| MFA Factors | v2.0 | `/v2.0/factors` | `limit`, `page` | `application/json` |
| Identity Sources | v1.0 | `/v1.0/identitysources` | `limit`, `page` | `application/json` |
| API Clients | v1.0 | `/v1.0/apiclients` | `limit`, `page` | `application/json` |
| Groups | v2.0 | `/v2.0/Groups` | `count`, `startIndex` (1-based) | `application/scim+json` |
| Users | v2.0 | `/v2.0/Users` | `count`, `startIndex` (1-based) | `application/scim+json` |

## Details

### v1.0 Endpoints (Standard JSON API)

These endpoints use standard JSON format with:
- **Pagination**: `limit` (page size) and `offset` (0-based starting position)
- **Accept Header**: `application/json`
- **Response Format**: JSON objects with arrays and pagination metadata

**Applications** (`/v1.0/applications`)
- Fetch all applications with pagination
- Working script: `fetch_applications.py`

**Application Details** (`/v1.0/applications/{id}`)
- Fetch detailed information for specific applications
- Working script: `fetch_application_details.py`

**Attributes** (`/v1.0/attributes`)
- Fetch user attribute schemas
- Working script: `fetch_attributes.py`

**Federations** (`/v1.0/saml/federations`)
- Fetch SAML 2.0 federation configurations
- Working script: `fetch_federations.py`

**Attribute Functions** (`/v1.0/attributefunctions`)
- Fetch attribute transformation functions
- Working script: `fetch_attribute_functions.py`
- Note: Returns all functions in single response (no pagination)

**MFA Authenticators** (`/v1.0/authenticators`)
- Fetch MFA authenticator configurations
- Working script: `fetch_mfa_config.py`
- Pagination: `limit` and `page` parameters

**MFA Factors** (`/v2.0/factors`)
- Fetch MFA factor configurations (v2.0 endpoint)
- Similar structure to authenticators endpoint

**Identity Sources** (`/v1.0/identitysources`)
- Fetch identity source configurations (SAML, LDAP, AD connectors)
- Working script: `fetch_identity_sources.py`
- Pagination: `limit` and `page` parameters
- Response: Contains `identitySources` array

**API Clients** (`/v1.0/apiclients`)
- Fetch API client configurations (OAuth/OIDC clients)
- Working script: `fetch_api_clients.py`
- Pagination: `limit` (default 200) and `page` parameters
- Response: Contains `apiClients` array

### v2.0 Endpoints (SCIM Format)

These endpoints use SCIM (System for Cross-domain Identity Management) format with:
- **Pagination**: `count` (page size) and `startIndex` (1-based starting position)
- **Accept Header**: `application/scim+json` (required)
- **Response Format**: SCIM JSON with `Resources` array, `totalResults`, `startIndex`, `itemsPerPage`

**Groups** (`/v2.0/Groups`)
- Fetch all groups using SCIM 2.0 format
- Working script: `fetch_groups.py`
- Response fields:
  - `totalResults`: Total number of groups
  - `Resources`: Array of group objects
  - `startIndex`: Current starting position (1-based)
  - `itemsPerPage`: Number of items in current page

**Users** (`/v2.0/Users`)
@property
def groups_url(self):
    return f"{self.TENANT_URL}/v2.0/Groups"

@property
def identity_sources_url(self):
    return f"{self.TENANT_URL}/v1.0/identitysources"

@property
def api_clients_url(self):
    return f"{self.TENANT_URL}/v1.0/apiclients"
```Code Implementation

### Config Module (`scripts/config.py`)

Each endpoint is defined as a property that returns the correct URL:

```python
@property
def applications_url(self):
    return f"{self.TENANT_URL}/v1.0/applications"

@property
def attributes_url(self):
    return f"{self.TENANT_URL}/v1.0/attributes"

@property
def federations_url(self):
    return f"{self.TENANT_URL}/v1.0/saml/federations"

@property
def groups_url(self):
    return f"{self.TENANT_URL}/v2.0/Groups"
```

### Client Methods (`scripts/fetch_applications.py`)

Two methods are available:

**_make_request()** - For v1.0 JSON endpoints
```python
def _make_request(self, url, params=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    # ... request logic
```

**_make_scim_request()** - For v2.0 SCIM endpoints
```python
## Data Collection Summary

Across all 6 environments (bidevt, widevt, biqat, wiqat, biprt, wiprt):

| Object Type | Total Count | Environments | Notes |
|------------|-------------|--------------|-------|
| Applications | 2,078 | All (6/6) | Tested and working |
| Attributes | 1,083 | All (6/6) | Tested and working |
| Groups | 7,077 | All (6/6) | SCIM v2.0 format |
| Attribute Functions | 78 | All (6/6) | 13 per environment (standard set) |
| Federations | 12 | All (6/6) | 2 per environment (SAML configs) |
| MFA Authenticators | 0 | All (6/6) | No authenticators configured (not a bug) |
| Identity Sources | 31 | All (6/6) | SAML, LDAP, AD connectors |
| API Clients | 25 | All (6/6) | OAuth/OIDC client configurations |

## Unavailable Endpoints

The following object types were requested but endpoints are not available in IBM Security Verify API:

| Object Type | Tested Endpoints | Status | Notes |
|------------|------------------|--------|-------|
| Roles | `/v1.0/roles`, `/v2.0/roles`, `/v1.0/access/roles` | ❌ Not Available | All returned HTML/404 errors |
| Access Policies | `/v1.0/policies`, `/v2.0/policies`, `/v1.0/authnpolicies` | ❌ Not Available | All returned HTML/404 errors |
| Themes/Branding | `/v1.0/themes`, `/v2.0/themes`, `/v1.0/branding` | ❌ Not Available | All returned HTML/404 or 404 errors |
| Entitlements | `/v1.0/entitlements`, `/v2.0/entitlements` | ❌ Not Available | 405 Method Not Allowed or 404 |
| Authentication Methods | `/v1.0/config/authn`, `/v1.0/authentication/config` | ❌ Not Available | All returned HTML/404 errors |

Note: These endpoints were tested using `test_additional_endpoints.py` diagnostic script. The API returns either HTML pages or 404/405 errors, indicating these resources are not exposed via the current API version or require different access patterns.
| Endpoint | Status | Count | Notes |
|----------|--------|-------|-------|
| Applications (v1.0) | ✅ Working | 306 | |
| Application Details (v1.0) | ✅ Working | 68/306 | 238 returned 403 (permissions) |
| Attributes (v1.0) | ✅ Working | 179 | |
| Federations (v1.0) | ⚠️ Updated | Not tested | |
| MFA Config (v1.0) | ⚠️ Updated | Not tested | |
| Groups (v2.0) | ✅ Working | 958 | SCIM format with `application/scim+json` |

## References

- [IBM Verify API Documentation](https://docs.verify.ibm.com/verify/page/api-documentation)
- [Groups Management Version 2.0](https://docs.verify.ibm.com/verify/reference/getgroups)
- [Users Management Version 2.0](https://docs.verify.ibm.com/verify/reference/bulkrequest)
- [Attributes API](https://docs.verify.ibm.com/verify/reference/getallattributes)
- [SAML 2.0 Federations Management](https://docs.verify.ibm.com/verify/reference/getpublicfederations-1)
- [Application Access](https://docs.verify.ibm.com/verify/reference/searchoperations)
