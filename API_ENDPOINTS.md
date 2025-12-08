# IBM Security Verify API Endpoints

This document describes the correct API endpoint versions for each object type based on IBM Security Verify documentation.

## Summary

| Object Type | API Version | Endpoint Path | Parameters | Accept Header |
|------------|-------------|---------------|------------|---------------|
| Applications | v1.0 | `/v1.0/applications` | `limit`, `offset` | `application/json` |
| Application Details | v1.0 | `/v1.0/applications/{id}` | N/A | `application/json` |
| Attributes | v1.0 | `/v1.0/attributes` | `limit`, `offset` | `application/json` |
| Federations | v1.0 | `/v1.0/saml/federations` | `limit`, `offset` | `application/json` |
| MFA Configuration | v1.0 | `/v1.0/authnmethods` | `limit`, `offset` | `application/json` |
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

**MFA Configuration** (`/v1.0/authnmethods`)
- Fetch MFA method configurations (metadata only, no secrets)
- Working script: `fetch_mfa_config.py`

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
- Fetch all users using SCIM 2.0 format
- Similar structure to Groups endpoint

## Code Implementation

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
def _make_scim_request(self, url, params=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/scim+json'
    }
    # ... request logic
```

## Testing Results

### WIPRT Environment

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
