# IBM Security Verify - IAM Visualization Dashboard

A comprehensive visualization dashboard for IBM Security Verify that presents applications, federations, MFA configurations, and other IAM data using D3.js and Carbon Design System.

## Features

### Visualizations
- **Application Overview**: Interactive treemap showing application categories and distribution
- **Network Graph**: Visualization of application relationships and dependencies
- **MFA Analytics**: Bar charts showing MFA adoption rates and method distribution
- **Federation Timeline**: Timeline view of federation configurations and activity
- **Attribute Analysis**: Visual representation of user attribute schemas

### Dashboard Features
- Responsive design with Carbon Design System
- Dark/light theme support
- Interactive tooltips with detailed information
- Search and filter capabilities
- Data export functionality
- Real-time data loading with error handling

## Project Structure

```
/
├── index.html                    # Main dashboard file
├── css/
│   └── styles.css               # Custom styles
├── js/
│   ├── main.js                  # Main application logic
│   ├── visualizations.js        # D3.js visualizations
│   └── data-loader.js           # Data loading utilities
├── scripts/
│   ├── fetch_applications.py
│   ├── fetch_application_details.py
│   ├── fetch_federations.py
│   ├── fetch_mfa_config.py
│   ├── fetch_attributes.py
│   ├── config.py
│   └── requirements.txt         # Python dependencies
├── data/                        # Directory for JSONL files
│   └── .gitkeep
├── .env.example                 # Environment variable template
└── README.md                    # This file
```

## Prerequisites

- Python 3.7 or higher
- Web browser (Chrome, Firefox, Safari, or Edge)
- IBM Security Verify tenant with API access
- OAuth 2.0 client credentials

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Iam_vision
```

### 2. Configure API Credentials

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your IBM Security Verify credentials:

```env
IBM_VERIFY_TENANT_URL=https://your-tenant.verify.ibm.com
IBM_VERIFY_CLIENT_ID=your-client-id
IBM_VERIFY_CLIENT_SECRET=your-client-secret
IBM_VERIFY_API_VERSION=v2.0
```

### 3. Install Python Dependencies

```bash
cd scripts
pip install -r requirements.txt
```

Or using a virtual environment:

```bash
cd scripts
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Fetch IAM Data

Run the Python scripts to collect data from IBM Security Verify:

```bash
# Fetch applications
python fetch_applications.py

# Fetch detailed application information
python fetch_application_details.py

# Fetch federation configurations
python fetch_federations.py

# Fetch MFA configurations
python fetch_mfa_config.py

# Fetch user attributes
python fetch_attributes.py
```

The scripts will create JSONL files in the `data/` directory:
- `data/applications.jsonl`
- `data/application_details.jsonl`
- `data/federations.jsonl`
- `data/mfa_configurations.jsonl`
- `data/attributes.jsonl`

### 5. Serve the Dashboard

Use a local web server to view the dashboard. You can use any of these methods:

**Using Python:**
```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

**Using Node.js (http-server):**
```bash
npx http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

**Using VS Code Live Server:**
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

## Python Scripts Reference

### config.py
Central configuration module that loads credentials from environment variables.

**Configuration Options:**
- `IBM_VERIFY_TENANT_URL`: Your IBM Security Verify tenant URL
- `IBM_VERIFY_CLIENT_ID`: OAuth 2.0 client ID
- `IBM_VERIFY_CLIENT_SECRET`: OAuth 2.0 client secret
- `IBM_VERIFY_API_VERSION`: API version (default: v2.0)
- `REQUEST_TIMEOUT`: Request timeout in seconds (default: 30)
- `MAX_RETRIES`: Maximum number of retry attempts (default: 3)
- `RETRY_BACKOFF`: Exponential backoff factor (default: 2.0)
- `DEFAULT_PAGE_SIZE`: Number of items per page (default: 100)
- `OUTPUT_DIR`: Output directory for data files (default: data)

### fetch_applications.py
Fetches all applications from IBM Security Verify with pagination support.

**Output:** `data/applications.jsonl`

**Usage:**
```bash
python fetch_applications.py
```

### fetch_application_details.py
Fetches detailed information for each application including entitlements and SSO configurations.

**Output:** `data/application_details.jsonl`

**Prerequisites:** Requires `applications.jsonl` to exist

**Usage:**
```bash
python fetch_application_details.py
```

### fetch_federations.py
Fetches federation configurations including SAML and OIDC settings.

**Output:** `data/federations.jsonl`

**Usage:**
```bash
python fetch_federations.py
```

### fetch_mfa_config.py
Fetches MFA configurations and authentication methods.

**Output:** `data/mfa_configurations.jsonl`

**Usage:**
```bash
python fetch_mfa_config.py
```

### fetch_attributes.py
Fetches user attributes and schema definitions.

**Output:** `data/attributes.jsonl`

**Usage:**
```bash
python fetch_attributes.py
```

## API Endpoint References

The scripts interact with the following IBM Security Verify API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `/v1.0/endpoint/default/token` | OAuth 2.0 token endpoint |
| `/v2.0/applications` | List all applications |
| `/v2.0/applications/{id}` | Get application details |
| `/v2.0/applications/{id}/entitlements` | Get application entitlements |
| `/v2.0/applications/{id}/sso` | Get SSO configuration |
| `/v2.0/federations` | List federation configurations |
| `/v2.0/authnmethods` | List MFA methods |
| `/v2.0/attributes` | List user attributes |

For complete API documentation, refer to the [IBM Security Verify API Documentation](https://www.ibm.com/docs/en/security-verify).

## Dashboard Usage

### Navigation
Use the top navigation bar to switch between different views:
- **Overview**: High-level metrics and key visualizations
- **Applications**: Detailed application network graph
- **Federations**: Federation timeline and activity
- **MFA Config**: MFA adoption and policies
- **Attributes**: User attribute analysis

### Features

**Theme Switcher**: Click the theme icon in the top-right to toggle between light and dark themes.

**Export Data**: Click the export icon to download all dashboard data as a JSON file.

**Search**: In the Applications view, use the search bar to filter applications by name, ID, or type.

**Interactive Visualizations**: 
- Hover over elements to see detailed information
- Click and drag nodes in the network graph
- Zoom and pan on large visualizations

## Data Format

All JSONL files follow this structure:

```json
{
  "fetch_timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "id": "application-id",
    "name": "Application Name",
    ...
  }
}
```

Each line in the JSONL file is a valid JSON object containing:
- `fetch_timestamp`: ISO 8601 timestamp of when the data was fetched
- `data`: The actual data object from the API response
- Additional fields specific to the data type (e.g., `application_id`, `method_id`)

## Troubleshooting

### Common Issues

**Error: "Failed to load data files"**
- Ensure you've run the Python scripts to fetch data
- Check that JSONL files exist in the `data/` directory
- Verify the web server is serving files from the correct directory

**Error: "Failed to obtain access token"**
- Verify your credentials in the `.env` file
- Check that the tenant URL is correct
- Ensure the client ID and secret have necessary permissions

**Empty Visualizations**
- Check browser console for error messages
- Verify JSONL files contain valid data
- Ensure the web page is loaded via a web server (not `file://`)

**CORS Errors**
- Use a proper web server (not `file://` protocol)
- Check that data files are in the correct directory

### Logging

Python scripts use the built-in logging module. To see detailed logs:

```bash
python fetch_applications.py 2>&1 | tee fetch.log
```

Browser console (F12) shows frontend logging and errors.

## Development

### Adding New Visualizations

1. Add visualization function to `js/visualizations.js`
2. Update the appropriate view renderer in `js/main.js`
3. Add CSS styling in `css/styles.css`

### Adding New Data Sources

1. Create a new fetch script in `scripts/`
2. Follow the pattern from existing scripts
3. Add endpoint configuration to `config.py`
4. Update `data-loader.js` to load the new data file
5. Create visualization in `visualizations.js`
6. Update the dashboard UI in `index.html`

## Security Considerations

- Never commit `.env` files to version control
- Store credentials securely
- Use HTTPS for production deployments
- Implement proper access controls for the dashboard
- Regularly rotate API credentials
- Review API permissions and use least-privilege principle

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Dependencies

### Frontend
- [Carbon Design System](https://carbondesignsystem.com/) v11
- [D3.js](https://d3js.org/) v7

### Backend
- [requests](https://requests.readthedocs.io/) - HTTP library
- [python-dotenv](https://pypi.org/project/python-dotenv/) - Environment variable management
- [urllib3](https://urllib3.readthedocs.io/) - HTTP client

## License

See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or questions:
- Create an issue in the repository
- Contact your IBM Security Verify administrator
- Refer to IBM Security Verify documentation

## Acknowledgments

- Built with [Carbon Design System](https://carbondesignsystem.com/) by IBM
- Visualizations powered by [D3.js](https://d3js.org/)
- Data from [IBM Security Verify](https://www.ibm.com/security/verify)
