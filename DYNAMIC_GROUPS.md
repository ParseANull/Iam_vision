# Dynamic Groups Feature

This branch contains scripts to fetch dynamic groups and their detailed information from IBM Security Verify environments.

## Overview

Dynamic groups in IBM Security Verify are groups with membership determined by attribute-based rules rather than explicit assignments. These groups automatically update their membership based on user attributes matching defined criteria.

## Scripts

### `fetch_dynamic_groups.py`
Fetches all dynamic groups from a specified environment.

**Usage:**
```bash
python scripts/fetch_dynamic_groups.py --env <environment>
```

**Output:** `data/{env}/dynamic_groups.jsonl`

**Example:**
```bash
python scripts/fetch_dynamic_groups.py --env wiprt
```

### `fetch_dynamic_groups_detail.py`
Fetches detailed information for each dynamic group, including:
- Full group configuration
- Membership rules and conditions
- ABAC policy details
- Current member count and status

**Usage:**
```bash
python scripts/fetch_dynamic_groups_detail.py --env <environment>
```

**Prerequisites:** Must run `fetch_dynamic_groups.py` first to collect group IDs.

**Output:** `data/{env}/dynamic_groups_detail.jsonl`

**Example:**
```bash
# First fetch the groups
python scripts/fetch_dynamic_groups.py --env wiprt

# Then fetch details
python scripts/fetch_dynamic_groups_detail.py --env wiprt
```

## API Requirements

**⚠️ IMPORTANT:** These scripts require API client credentials with **ABAC (Attribute-Based Access Control) entitlements**.

### Current Status

The API client used in this project **does not currently have ABAC entitlements**, which means:

- The `/v1.0/dynamicgroups` endpoint returns `401 Unauthorized`
- Dynamic groups cannot be accessed or managed via the API
- Both scripts include proper error handling for this scenario

### Error Handling

Both scripts detect the missing permissions and provide clear error messages:

```
Permission error: API client requires ABAC entitlements to access dynamic groups.
Contact your IBM Security Verify administrator to grant the necessary permissions.
```

## Enabling This Feature

To enable dynamic groups functionality:

1. Contact your IBM Security Verify administrator
2. Request ABAC entitlements for your API client credentials
3. Update the appropriate `.env.{environment}` file if new credentials are issued
4. Run the scripts again

## API Endpoints

- **List Dynamic Groups:** `GET /v1.0/dynamicgroups`
  - Redirects to: `/abac/v1.0/dynamicgroups/`
  - Supports pagination via `offset` and `limit` parameters

- **Group Details:** `GET /v1.0/dynamicgroups/{groupId}`
  - Provides detailed configuration and rules for a specific group

## Testing Status

### wiprt Environment
- **Total Groups:** 958
- **Dynamic Groups:** 0
- **Group Types Found:** `standard`, `reserved`
- **ABAC Endpoint Status:** 401 Unauthorized

This suggests that either:
1. No dynamic groups have been configured in this environment, or
2. The API client lacks permissions to view them

## Integration with Main Branch

These scripts follow the same patterns as other fetch scripts in the project:

- Use the shared `IBMVerifyClient` from `fetch_applications.py`
- Use the `Config` class for environment configuration
- Output to `data/{env}/` directory in JSONL format
- Support `--env` parameter for environment selection
- Include comprehensive error handling and logging

## Future Considerations

Once ABAC entitlements are granted:

1. Test scripts across all environments to verify access
2. Examine the structure of returned dynamic group data
3. Potentially enhance scripts to include:
   - Member enumeration for each dynamic group
   - Rule evaluation testing
   - ABAC policy analysis
4. Consider merging to main branch if dynamic groups are actively used

## Related Documentation

- IBM Security Verify ABAC Documentation
- [Group Management API Reference](https://docs.verify.ibm.com/verify/reference/getgroups)
- [Dynamic Groups Endpoint](https://docs.verify.ibm.com/verify/reference/getdynamicgroups)

## Branch Information

**Branch:** `feature/dynamic-groups`  
**Status:** Future feature - pending ABAC entitlements  
**Created:** December 8, 2025
