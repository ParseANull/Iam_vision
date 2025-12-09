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
    
    // Schedule auto-collapse of sidebar after 5 seconds
    scheduleAutoCollapseSidebar();
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
 * Initialize environment selector UI
 */
function initializeEnvironmentSelector() {
    console.log('Initializing environment selector...');
    
    const toggle = document.getElementById('environment-selector-toggle');
    const menu = document.getElementById('environment-selector-menu');
    const label = document.getElementById('environment-selector-label');
    
    if (!toggle || !menu || !AppState.availableEnvironments) {
        console.error('Environment selector elements not found');
        return;
    }
    
    // Populate menu with environments
    populateEnvironmentMenu();
    
    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        menu.style.display = isExpanded ? 'none' : 'block';
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            toggle.setAttribute('aria-expanded', 'false');
            menu.style.display = 'none';
        }
    });
    
    // Initialize profile menu
    initializeProfileMenu();
    
    // Initialize sidebar toggle
    initializeSidebarToggle();
    
    console.log('✓ Environment selector initialized');
}

/**
 * Populate environment selector menu
 */
function populateEnvironmentMenu() {
    const menu = document.getElementById('environment-selector-menu');
    menu.innerHTML = '';
    
    for (const [envId, envInfo] of Object.entries(AppState.availableEnvironments)) {
        const item = document.createElement('div');
        item.className = 'bx--list-box__menu-item';
        item.setAttribute('role', 'option');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `env-${envId}`;
        checkbox.value = envId;
        checkbox.checked = AppState.selectedEnvironments.includes(envId);
        
        const textWrapper = document.createElement('div');
        textWrapper.className = 'bx--list-box__menu-item-text';
        
        const title = document.createElement('span');
        title.className = 'bx--list-box__menu-item-title';
        title.textContent = `${envInfo.name} (${envId})`;
        
        const description = document.createElement('span');
        description.className = 'bx--list-box__menu-item-description';
        description.textContent = envInfo.description;
        
        textWrapper.appendChild(title);
        textWrapper.appendChild(description);
        
        item.appendChild(checkbox);
        item.appendChild(textWrapper);
        
        // Handle selection
        item.addEventListener('click', async (e) => {
            if (e.target === checkbox) return; // Let checkbox handle itself
            checkbox.checked = !checkbox.checked;
            await handleEnvironmentToggle(envId, checkbox.checked);
        });
        
        checkbox.addEventListener('change', async (e) => {
            await handleEnvironmentToggle(envId, e.target.checked);
        });
        
        menu.appendChild(item);
    }
}

/**
 * Handle environment selection toggle
 */
async function handleEnvironmentToggle(envId, isSelected) {
    try {
        await selectEnvironment(envId, isSelected);
        updateEnvironmentSelectorLabel();
        populateFilterSidebar();
        
        // Auto-open sidebar if environments are selected and it was collapsed
        if (isSelected && AppState.selectedEnvironments.length === 1) {
            const content = document.getElementById('main-content');
            if (content.getAttribute('data-sidebar-collapsed') === 'true') {
                toggleSidebar(true);
            }
        }
    } catch (error) {
        console.error('Error toggling environment:', error);
        // Revert checkbox state
        const checkbox = document.getElementById(`env-${envId}`);
        if (checkbox) {
            checkbox.checked = !isSelected;
        }
    }
}

/**
 * Update environment selector label
 */
function updateEnvironmentSelectorLabel() {
    const label = document.getElementById('environment-selector-label');
    const count = AppState.selectedEnvironments.length;
    
    if (count === 0) {
        label.textContent = 'Select Environments';
    } else if (count === 1) {
        const envId = AppState.selectedEnvironments[0];
        const envInfo = AppState.availableEnvironments[envId];
        label.textContent = envInfo ? envInfo.name : envId;
    } else {
        label.textContent = `${count} Environments Selected`;
    }
}

/**
 * Initialize profile menu
 */
function initializeProfileMenu() {
    const toggle = document.getElementById('profile-menu-toggle');
    const menu = document.getElementById('profile-menu');
    const rememberToggle = document.getElementById('remember-selection-toggle');
    const autoCollapseToggle = document.getElementById('auto-collapse-sidebar-toggle');
    
    if (!toggle || !menu) return;
    
    // Set initial states from preferences
    if (rememberToggle) {
        rememberToggle.checked = AppState.preferences.rememberSelection;
        rememberToggle.addEventListener('change', (e) => {
            AppState.preferences.rememberSelection = e.target.checked;
            saveUserPreferences();
        });
    }
    
    if (autoCollapseToggle) {
        autoCollapseToggle.checked = AppState.preferences.autoCollapseSidebar !== false;
        autoCollapseToggle.addEventListener('change', (e) => {
            AppState.preferences.autoCollapseSidebar = e.target.checked;
            saveUserPreferences();
        });
    }
    
    // Toggle menu
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    
    // Preferences button (placeholder)
    const preferencesBtn = document.getElementById('preferences-button');
    if (preferencesBtn) {
        preferencesBtn.addEventListener('click', () => {
            console.log('Preferences dialog - to be implemented');
            // TODO: Open preferences modal
        });
    }
}

/**
 * Initialize sidebar toggle functionality
 */
function initializeSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const content = document.getElementById('main-content');
    
    if (!toggleBtn || !content) return;
    
    toggleBtn.addEventListener('click', () => {
        const isCollapsed = content.getAttribute('data-sidebar-collapsed') === 'true';
        toggleSidebar(!isCollapsed);
    });
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar(shouldExpand) {
    const content = document.getElementById('main-content');
    const sidebar = document.getElementById('filter-sidebar');
    
    if (shouldExpand) {
        content.setAttribute('data-sidebar-collapsed', 'false');
        sidebar.setAttribute('data-expanded', 'true');
    } else {
        content.setAttribute('data-sidebar-collapsed', 'true');
        sidebar.setAttribute('data-expanded', 'false');
    }
}

/**
 * Auto-collapse sidebar after delay (called after data load)
 */
function scheduleAutoCollapseSidebar() {
    if (!AppState.preferences.autoCollapseSidebar) return;
    
    setTimeout(() => {
        const content = document.getElementById('main-content');
        if (content && content.getAttribute('data-sidebar-collapsed') !== 'true') {
            console.log('Auto-collapsing sidebar after 5 seconds');
            toggleSidebar(false);
        }
    }, 5000);
}

/**
 * Populate filter sidebar with accordion for selected environments
 */
function populateFilterSidebar() {
    const container = document.getElementById('filter-sidebar-content');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    if (AppState.selectedEnvironments.length === 0) {
        container.innerHTML = '<div style="padding: 2rem 1rem; text-align: center; color: #525252; font-size: 0.875rem;">Select an environment to configure filters</div>';
        return;
    }
    
    // Create accordion list
    const accordion = document.createElement('ul');
    accordion.className = 'filter-accordion';
    accordion.setAttribute('role', 'list');
    
    AppState.selectedEnvironments.forEach((envId, index) => {
        const envConfig = AppState.availableEnvironments.find(e => e.id === envId);
        if (!envConfig) return;
        
        const item = createFilterAccordionItem(envId, envConfig, index === 0);
        accordion.appendChild(item);
    });
    
    container.appendChild(accordion);
    
    // Wire up Clear All button
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.onclick = handleClearAllFilters;
    }
}

/**
 * Create a single accordion item for an environment
 */
function createFilterAccordionItem(envId, envConfig, isExpanded = false) {
    const li = document.createElement('li');
    li.className = 'filter-accordion-item';
    
    // Header button
    const header = document.createElement('button');
    header.className = 'filter-accordion-header';
    header.setAttribute('aria-expanded', isExpanded);
    header.setAttribute('aria-controls', `filter-content-${envId}`);
    
    const title = document.createElement('div');
    title.className = 'filter-accordion-title';
    title.innerHTML = `
        <span>${envConfig.name}</span>
        <span style="font-size: 0.75rem; font-weight: 400; color: #525252;">(${envId})</span>
    `;
    
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'filter-accordion-chevron');
    chevron.setAttribute('viewBox', '0 0 16 16');
    chevron.innerHTML = '<path d="M6 4l6 4-6 4V4z"/>';
    
    header.appendChild(title);
    header.appendChild(chevron);
    
    // Content area
    const content = document.createElement('div');
    content.className = 'filter-accordion-content';
    content.id = `filter-content-${envId}`;
    content.setAttribute('aria-hidden', !isExpanded);
    
    const body = document.createElement('div');
    body.className = 'filter-accordion-body';
    
    // Data type checkboxes
    const dataTypes = AppState.dataTypeSelections[envId];
    if (dataTypes) {
        const list = document.createElement('ul');
        list.className = 'data-type-list';
        
        Object.entries(dataTypes).forEach(([dataType, isEnabled]) => {
            const item = createDataTypeCheckbox(envId, dataType, isEnabled);
            list.appendChild(item);
        });
        
        body.appendChild(list);
    }
    
    content.appendChild(body);
    
    // Click handler for accordion toggle
    header.addEventListener('click', () => {
        const isCurrentlyExpanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', !isCurrentlyExpanded);
        content.setAttribute('aria-hidden', isCurrentlyExpanded);
    });
    
    li.appendChild(header);
    li.appendChild(content);
    
    return li;
}

/**
 * Create a checkbox for a data type
 */
function createDataTypeCheckbox(envId, dataType, isEnabled) {
    const li = document.createElement('li');
    li.className = 'data-type-item';
    
    const label = document.createElement('label');
    label.className = 'data-type-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isEnabled;
    checkbox.id = `filter-${envId}-${dataType}`;
    
    const labelText = document.createElement('span');
    labelText.className = 'data-type-label';
    labelText.textContent = formatDataTypeName(dataType);
    
    // Get count from cache if available
    const count = getDataTypeCount(envId, dataType);
    const countSpan = document.createElement('span');
    countSpan.className = 'data-type-count';
    countSpan.textContent = count !== null ? `(${count})` : '';
    
    label.appendChild(checkbox);
    label.appendChild(labelText);
    label.appendChild(countSpan);
    
    // Change handler
    checkbox.addEventListener('change', async (e) => {
        await handleDataTypeToggle(envId, dataType, e.target.checked);
    });
    
    li.appendChild(label);
    return li;
}

/**
 * Format data type name for display
 */
function formatDataTypeName(dataType) {
    const nameMap = {
        'applications': 'Applications',
        'federations': 'Federations',
        'mfa_config': 'MFA Config',
        'attributes': 'Attributes',
        'entity_types': 'Entity Types',
        'scim_capabilities': 'SCIM Capabilities',
        'dynamic_groups': 'Dynamic Groups',
        'dynamic_groups_detail': 'Dynamic Groups Detail'
    };
    return nameMap[dataType] || dataType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get count of items for a data type from cache
 */
function getDataTypeCount(envId, dataType) {
    const cache = AppState.dataCache[envId];
    if (!cache || cache._status !== 'loaded') return null;
    
    const data = cache[dataType];
    return Array.isArray(data) ? data.length : null;
}

/**
 * Handle data type checkbox toggle
 */
async function handleDataTypeToggle(envId, dataType, isEnabled) {
    try {
        toggleDataType(envId, dataType, isEnabled);
        console.log(`${isEnabled ? 'Enabled' : 'Disabled'} ${dataType} for ${envId}`);
    } catch (error) {
        console.error('Failed to toggle data type:', error);
        // Revert checkbox on error
        const checkbox = document.getElementById(`filter-${envId}-${dataType}`);
        if (checkbox) checkbox.checked = !isEnabled;
    }
}

/**
 * Handle Clear All filters
 */
function handleClearAllFilters() {
    if (AppState.selectedEnvironments.length === 0) return;
    
    if (confirm('Clear all filters and deselect all environments?')) {
        // Deselect all environments
        AppState.selectedEnvironments.forEach(envId => {
            selectEnvironment(envId, false);
        });
        
        // Update UI
        updateEnvironmentSelectorLabel();
        populateFilterSidebar();
        showEnvironmentSelectionPrompt();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
