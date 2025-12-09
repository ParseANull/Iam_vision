/**
 * Main Application Logic
 * Handles initialization, navigation, and data management
 */

// Global state
const AppState = {
    // Environment management
    availableEnvironments: null,      // Loaded from environments.json
    selectedEnvironments: [],         // Array of selected env IDs
    
    // Data type selections per environment (all enabled by default)
    dataTypeSelections: {},           // { envId: { dataType: boolean } }
    
    // Data cache per environment
    dataCache: {},                    // { envId: { dataType: [...], _loadedAt, _status } }
    
    // Legacy single environment data (for backward compatibility during migration)
    data: null,
    
    // View state
    currentView: 'overview',
    theme: 'light',
    
    // Comparison mode
    comparisonMode: false,            // Single vs multi-environment view
    viewLayout: 'overlay',            // 'overlay' or 'side-by-side'
    
    // Performance monitoring
    performanceMetrics: {
        lastRenderTime: 0,
        renderCount: 0,
        dataLimitEnabled: false,
        dataLimitPercentage: 100      // 1-100%
    },
    
    // User preferences
    preferences: {
        defaultEnvironments: [],
        defaultDataTypes: {},
        rememberSelection: true,
        autoLoadOnSelect: true
    }
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing IAM Visualization Dashboard...');
    
    // Load user preferences first
    loadUserPreferences();
    
    // Set up event listeners
    setupNavigation();
    setupThemeSwitcher();
    setupExport();
    setupSearch();
    
    // Load environments configuration
    try {
        await loadEnvironmentsConfig();
        
        // Set up environment selector UI
        initializeEnvironmentSelector();
        
        // Try to restore previous session or URL params
        await restoreSessionState();
        
    } catch (error) {
        console.error('Failed to initialize environments:', error);
        showError('Failed to load environment configuration. Please check environments.json file.');
    }
}

/**
 * Load environments configuration from environments.json
 */
async function loadEnvironmentsConfig() {
    try {
        const response = await fetch('environments.json');
        if (!response.ok) {
            throw new Error(`Failed to load environments.json: ${response.statusText}`);
        }
        
        const config = await response.json();
        
        // Validate structure
        if (!config.environments || typeof config.environments !== 'object') {
            throw new Error('Invalid environments.json structure');
        }
        
        // Validate each environment has data directory
        const validated = {};
        for (const [envId, envData] of Object.entries(config.environments)) {
            try {
                // Check if at least one data file exists
                const testResponse = await fetch(`data/${envId}/applications.jsonl`, { method: 'HEAD' });
                if (testResponse.ok) {
                    validated[envId] = envData;
                } else {
                    console.warn(`Environment ${envId} data directory not accessible, excluding from available environments`);
                }
            } catch (error) {
                console.warn(`Environment ${envId} validation failed:`, error.message);
            }
        }
        
        if (Object.keys(validated).length === 0) {
            throw new Error('No valid environments found with accessible data directories');
        }
        
        AppState.availableEnvironments = validated;
        console.log(`Loaded ${Object.keys(validated).length} valid environments:`, Object.keys(validated));
        
        return validated;
        
    } catch (error) {
        console.error('Error loading environments:', error);
        throw error;
    }
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
    try {
        const stored = localStorage.getItem('iamvision_preferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            AppState.preferences = { ...AppState.preferences, ...prefs };
            console.log('Loaded user preferences:', AppState.preferences);
        }
    } catch (error) {
        console.warn('Failed to load preferences:', error);
    }
}

/**
 * Save user preferences to localStorage
 */
function saveUserPreferences() {
    try {
        localStorage.setItem('iamvision_preferences', JSON.stringify(AppState.preferences));
    } catch (error) {
        console.warn('Failed to save preferences:', error);
    }
}

/**
 * Restore session state from URL params or localStorage
 */
async function restoreSessionState() {
    // Priority: URL params > localStorage > no selection
    
    // Check URL parameters first (shareable links)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEnvs = urlParams.get('envs');
    
    if (urlEnvs) {
        const envIds = urlEnvs.split(',').filter(id => AppState.availableEnvironments[id]);
        if (envIds.length > 0) {
            console.log('Restoring environments from URL:', envIds);
            for (const envId of envIds) {
                await selectEnvironment(envId, true);
            }
            return;
        }
    }
    
    // Try localStorage if rememberSelection is enabled
    if (AppState.preferences.rememberSelection) {
        try {
            const stored = localStorage.getItem('iamvision_selected_environments');
            if (stored) {
                const envIds = JSON.parse(stored).filter(id => AppState.availableEnvironments[id]);
                if (envIds.length > 0) {
                    console.log('Restoring environments from localStorage:', envIds);
                    for (const envId of envIds) {
                        await selectEnvironment(envId, true);
                    }
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to restore from localStorage:', error);
        }
    }
    
    // No restoration - show empty state with instruction
    console.log('No environments selected - showing selection prompt');
    showEnvironmentSelectionPrompt();
}

/**
 * Show prompt to select environments
 */
function showEnvironmentSelectionPrompt() {
    const loadingState = document.getElementById('loading-state');
    loadingState.style.display = 'flex';
    loadingState.innerHTML = `
        <div class="bx--loading-message">
            <svg class="bx--loading__svg" width="50" height="50" viewBox="0 0 100 100">
                <circle cx="50%" cy="50%" r="44" fill="none" stroke="#0f62fe" stroke-width="4" stroke-dasharray="283" stroke-dashoffset="280">
                    <animate attributeName="stroke-dashoffset" values="280;0" dur="1.4s" repeatCount="indefinite"/>
                </circle>
            </svg>
            <p class="selection-prompt-title">Select an Environment to Begin</p>
            <p class="selection-prompt-subtitle">Choose one or more environments from the selector above to visualize IAM data</p>
        </div>
    `;
}

/**
 * Load all IAM data (legacy - kept for backward compatibility)
 */
async function loadData() {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    try {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        
        console.log('Loading IAM data...');
        AppState.data = await DataLoader.loadAllData();
        
        console.log('Data loaded:', {
            applications: AppState.data.applications.length,
            federations: AppState.data.federations.length,
            mfaConfigurations: AppState.data.mfaConfigurations.length,
            attributes: AppState.data.attributes.length
        });
        
        // Hide loading state
        loadingState.style.display = 'none';
        
        // Update all visualizations
        updateDashboard();
        
    } catch (error) {
        console.error('Error loading data:', error);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorMessage.textContent = `${error.message}. Please ensure data files are present in the data/ directory.`;
    }
}

/**
 * Select or deselect an environment
 * @param {string} envId - Environment ID to toggle
 * @param {boolean} isSelected - Whether to select or deselect
 */
async function selectEnvironment(envId, isSelected) {
    if (!AppState.availableEnvironments[envId]) {
        console.error(`Invalid environment: ${envId}`);
        return;
    }
    
    const startTime = performance.now();
    
    if (isSelected) {
        // Add to selection
        if (!AppState.selectedEnvironments.includes(envId)) {
            AppState.selectedEnvironments.push(envId);
            
            // Initialize data type selections (all enabled by default)
            initializeDataTypeSelections(envId);
            
            // Load data if not cached
            if (!AppState.dataCache[envId]) {
                await loadEnvironmentData(envId);
            }
        }
    } else {
        // Remove from selection
        AppState.selectedEnvironments = AppState.selectedEnvironments.filter(e => e !== envId);
    }
    
    // Save selection to localStorage
    if (AppState.preferences.rememberSelection) {
        localStorage.setItem('iamvision_selected_environments', JSON.stringify(AppState.selectedEnvironments));
    }
    
    // Update URL params for sharing
    updateURLParams();
    
    // Update dashboard
    if (AppState.selectedEnvironments.length > 0) {
        await updateDashboardMultiEnv();
    } else {
        showEnvironmentSelectionPrompt();
    }
    
    // Track performance
    const renderTime = performance.now() - startTime;
    trackPerformance(renderTime);
}

/**
 * Initialize data type selections for an environment (all enabled by default)
 */
function initializeDataTypeSelections(envId) {
    AppState.dataTypeSelections[envId] = {
        applications: true,
        application_details: true,
        federations: true,
        mfa_configurations: true,
        attributes: true,
        identity_sources: true,
        api_clients: true,
        scim_capabilities: true
    };
}

/**
 * Load all data for a specific environment
 */
async function loadEnvironmentData(envId) {
    console.log(`Loading data for environment: ${envId}...`);
    
    try {
        AppState.dataCache[envId] = { _status: 'loading', _loadedAt: null };
        
        const dataTypes = Object.keys(AppState.dataTypeSelections[envId] || {});
        const results = {};
        
        // Load all data types in parallel
        await Promise.all(dataTypes.map(async (dataType) => {
            try {
                const filename = `${dataType}.jsonl`;
                const data = await DataLoader.loadJSONL(`${envId}/${filename}`);
                results[dataType] = data;
            } catch (error) {
                console.warn(`Could not load ${envId}/${dataType}.jsonl:`, error.message);
                results[dataType] = [];
            }
        }));
        
        // Update cache
        AppState.dataCache[envId] = {
            ...results,
            _status: 'complete',
            _loadedAt: new Date().toISOString()
        };
        
        console.log(`✓ Loaded ${envId}:`, Object.entries(results).map(([type, data]) => `${type}(${data.length})`).join(', '));
        
    } catch (error) {
        AppState.dataCache[envId] = {
            _status: 'error',
            _error: error.message,
            _loadedAt: new Date().toISOString()
        };
        
        showNotification({
            type: 'error',
            title: `Failed to load ${envId}`,
            message: error.message
        });
        
        throw error;
    }
}

/**
 * Toggle a data type for a specific environment
 */
function toggleDataType(envId, dataType, isEnabled) {
    if (!AppState.dataTypeSelections[envId]) {
        console.error(`No selections for environment: ${envId}`);
        return;
    }
    
    AppState.dataTypeSelections[envId][dataType] = isEnabled;
    
    // Update dashboard (no need to reload data, just filter from cache)
    updateDashboardMultiEnv();
}

/**
 * Update dashboard with multi-environment data
 */
async function updateDashboardMultiEnv() {
    if (AppState.selectedEnvironments.length === 0) {
        showEnvironmentSelectionPrompt();
        return;
    }
    
    const loadingState = document.getElementById('loading-state');
    loadingState.style.display = 'none';
    
    // Get filtered and aggregated data
    const filteredData = getFilteredData();
    const aggregatedData = aggregateData(filteredData);
    
    // Update legacy AppState.data for backward compatibility
    AppState.data = aggregatedData;
    
    // Determine if we're in comparison mode
    AppState.comparisonMode = AppState.selectedEnvironments.length > 1;
    
    // Update metrics
    updateMetricsMultiEnv(aggregatedData);
    
    // Update current view
    updateView(AppState.currentView);
}

/**
 * Get filtered data based on current selections
 */
function getFilteredData() {
    const filtered = {};
    
    for (const envId of AppState.selectedEnvironments) {
        const envData = AppState.dataCache[envId];
        const selections = AppState.dataTypeSelections[envId];
        
        if (!envData || envData._status !== 'complete') {
            console.warn(`Environment ${envId} not loaded or has error`);
            continue;
        }
        
        filtered[envId] = {};
        
        for (const [dataType, isSelected] of Object.entries(selections)) {
            if (isSelected && envData[dataType]) {
                filtered[envId][dataType] = envData[dataType];
            }
        }
    }
    
    return filtered;
}

/**
 * Aggregate data across environments
 */
function aggregateData(filteredData) {
    const aggregated = {
        applications: [],
        applicationDetails: [],
        federations: [],
        mfaConfigurations: [],
        attributes: [],
        identitySources: [],
        apiClients: [],
        scimCapabilities: []
    };
    
    // Map data type keys to aggregated keys (handle naming differences)
    const keyMap = {
        'applications': 'applications',
        'application_details': 'applicationDetails',
        'federations': 'federations',
        'mfa_configurations': 'mfaConfigurations',
        'attributes': 'attributes',
        'identity_sources': 'identitySources',
        'api_clients': 'apiClients',
        'scim_capabilities': 'scimCapabilities'
    };
    
    for (const [envId, envData] of Object.entries(filteredData)) {
        const envInfo = AppState.availableEnvironments[envId];
        
        for (const [dataType, items] of Object.entries(envData)) {
            const aggregatedKey = keyMap[dataType] || dataType;
            
            if (!aggregated[aggregatedKey]) {
                aggregated[aggregatedKey] = [];
            }
            
            // Tag each item with environment metadata
            const tagged = items.map(item => ({
                ...item,
                _environmentId: envId,
                _environmentName: envInfo.name,
                _environmentDomain: envInfo.url_domain
            }));
            
            aggregated[aggregatedKey] = aggregated[aggregatedKey].concat(tagged);
        }
    }
    
    return aggregated;
}

/**
 * Update metrics for multi-environment view
 */
function updateMetricsMultiEnv(aggregatedData) {
    document.getElementById('total-applications').textContent = aggregatedData.applications.length;
    document.getElementById('total-federations').textContent = aggregatedData.federations.length;
    document.getElementById('total-mfa').textContent = aggregatedData.mfaConfigurations.length;
    document.getElementById('total-attributes').textContent = aggregatedData.attributes.length;
}

/**
 * Update URL parameters for sharing
 */
function updateURLParams() {
    if (AppState.selectedEnvironments.length > 0) {
        const params = new URLSearchParams(window.location.search);
        params.set('envs', AppState.selectedEnvironments.join(','));
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    } else {
        // Clear params if no environments selected
        window.history.replaceState({}, '', window.location.pathname);
    }
}

/**
 * Track performance and check if data limiting is needed
 */
function trackPerformance(renderTime) {
    AppState.performanceMetrics.lastRenderTime = renderTime;
    AppState.performanceMetrics.renderCount++;
    
    console.log(`Render time: ${renderTime.toFixed(2)}ms`);
    
    // Check if performance is degraded (> 30 seconds)
    if (renderTime > 30000 && !AppState.performanceMetrics.dataLimitEnabled) {
        showPerformanceLimitDialog(renderTime);
    }
}

/**
 * Show dialog to enable data limiting due to performance
 */
function showPerformanceLimitDialog(renderTime) {
    const seconds = (renderTime / 1000).toFixed(1);
    
    // TODO: Implement proper Carbon modal
    const message = `Rendering took ${seconds} seconds. Would you like to limit the data displayed to improve performance?`;
    
    if (confirm(message)) {
        showDataLimitSlider();
    }
}

/**
 * Show data limit slider (will be implemented in Phase 7)
 */
function showDataLimitSlider() {
    console.log('Data limit slider - to be implemented in Phase 7');
    // Placeholder for slider implementation
}

/**
 * Show notification (Carbon inline notification)
 */
function showNotification({ type, title, message }) {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    // TODO: Implement proper Carbon notification in Phase 7
}

/**
 * Show error message
 */
function showError(message) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const loadingState = document.getElementById('loading-state');
    
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorMessage.textContent = message;
}

/**
 * Update dashboard with current data
 */
function updateDashboard() {
    if (!AppState.data) return;
    
    // Update metrics
    updateMetrics();
    
    // Update current view
    updateView(AppState.currentView);
}

/**
 * Update metric cards
 */
function updateMetrics() {
    const summary = DataLoader.getSummary(AppState.data);
    
    document.getElementById('total-applications').textContent = summary.totalApplications;
    document.getElementById('total-federations').textContent = summary.totalFederations;
    document.getElementById('total-mfa').textContent = summary.totalMfaMethods;
    document.getElementById('total-attributes').textContent = summary.totalAttributes;
}

/**
 * Update the current view
 * @param {string} viewName - Name of the view to display
 */
function updateView(viewName) {
    console.log(`Updating view: ${viewName}`);
    
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show selected view
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
        viewElement.style.display = 'block';
    }
    
    // Update navigation active state
    document.querySelectorAll('.bx--header__menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
    
    // Render view-specific visualizations
    switch (viewName) {
        case 'overview':
            renderOverview();
            break;
        case 'applications':
            renderApplications();
            break;
        case 'federations':
            renderFederations();
            break;
        case 'mfa':
            renderMFA();
            break;
        case 'attributes':
            renderAttributes();
            break;
    }
    
    AppState.currentView = viewName;
}

/**
 * Render overview visualizations
 */
function renderOverview() {
    if (!AppState.data) return;
    
    // Application treemap
    const grouped = DataLoader.groupByCategory(AppState.data.applications);
    Visualizations.createTreemap('app-treemap', grouped);
    
    // MFA adoption chart
    Visualizations.createMFAChart('mfa-chart', AppState.data.mfaConfigurations);
}

/**
 * Render applications view
 */
function renderApplications() {
    if (!AppState.data) return;
    
    Visualizations.createNetworkGraph(
        'app-network',
        AppState.data.applications,
        AppState.data.applicationDetails
    );
}

/**
 * Render federations view
 */
function renderFederations() {
    if (!AppState.data) return;
    
    Visualizations.createTimeline('federation-timeline', AppState.data.federations);
}

/**
 * Render MFA view
 */
function renderMFA() {
    if (!AppState.data) return;
    
    // MFA distribution
    Visualizations.createMFAChart('mfa-distribution', AppState.data.mfaConfigurations);
    
    // MFA policies (reuse chart with different data representation)
    const policyData = AppState.data.mfaConfigurations.map(item => ({
        ...item,
        data: {
            ...item.data,
            type: item.data?.policy || 'No Policy'
        }
    }));
    Visualizations.createMFAChart('mfa-policies', policyData);
}

/**
 * Render attributes view
 */
function renderAttributes() {
    if (!AppState.data) return;
    
    // Group attributes by type
    const attributesByType = {};
    AppState.data.attributes.forEach(attr => {
        const attrData = attr.data || attr;
        const type = attrData.type || attrData.dataType || 'String';
        attributesByType[type] = (attributesByType[type] || 0) + 1;
    });
    
    // Convert to format for treemap
    const grouped = {};
    Object.entries(attributesByType).forEach(([type, count]) => {
        grouped[type] = Array(count).fill({ type });
    });
    
    Visualizations.createTreemap('attributes-chart', grouped);
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
    document.querySelectorAll('.bx--header__menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            if (view) {
                updateView(view);
            }
        });
    });
}

/**
 * Set up theme switcher
 */
function setupThemeSwitcher() {
    const themeSwitcher = document.getElementById('theme-switcher');
    if (!themeSwitcher) return;
    
    themeSwitcher.addEventListener('click', () => {
        AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', AppState.theme);
        
        // Redraw visualizations with new theme
        if (AppState.data) {
            updateView(AppState.currentView);
        }
    });
}

/**
 * Set up export functionality
 */
function setupExport() {
    const exportButton = document.getElementById('export-data');
    if (!exportButton) return;
    
    exportButton.addEventListener('click', () => {
        if (!AppState.data) {
            alert('No data to export');
            return;
        }
        
        const summary = DataLoader.getSummary(AppState.data);
        const exportData = {
            summary,
            timestamp: new Date().toISOString(),
            data: {
                applications: DataLoader.extractData(AppState.data.applications),
                federations: DataLoader.extractData(AppState.data.federations),
                mfaConfigurations: DataLoader.extractData(AppState.data.mfaConfigurations),
                attributes: DataLoader.extractData(AppState.data.attributes)
            }
        };
        
        // Create download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `iam-dashboard-export-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Data exported successfully');
    });
}

/**
 * Set up search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('app-search');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value;
            if (AppState.data && AppState.currentView === 'applications') {
                const filtered = DataLoader.filterData(
                    AppState.data.applications,
                    searchTerm
                );
                Visualizations.createNetworkGraph(
                    'app-network',
                    filtered,
                    AppState.data.applicationDetails
                );
            }
        }, 300);
    });
    
    // Clear button
    const clearButton = searchInput.parentElement.querySelector('.bx--search-close');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            if (AppState.data && AppState.currentView === 'applications') {
                renderApplications();
            }
        });
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (AppState.data) {
        updateView(AppState.currentView);
    }
}

// Debounce resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 250);
});

/**
 * Initialize environment selector UI (placeholder - will be implemented in Phase 2)
 */
function initializeEnvironmentSelector() {
    console.log('Environment selector initialization - to be implemented in Phase 2');
    // This will create the multi-select dropdown in the header
    // For now, we'll rely on the restoration logic
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
