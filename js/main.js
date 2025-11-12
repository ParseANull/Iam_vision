/**
 * Main Application Logic
 * Handles initialization, navigation, and data management
 */

// Global state
const AppState = {
    data: null,
    currentView: 'overview',
    theme: 'light'
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing IAM Visualization Dashboard...');
    
    // Set up event listeners
    setupNavigation();
    setupThemeSwitcher();
    setupExport();
    setupSearch();
    
    // Load data
    await loadData();
}

/**
 * Load all IAM data
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
