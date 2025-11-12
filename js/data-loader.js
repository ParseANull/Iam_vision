/**
 * Data Loader Module
 * Handles loading and parsing JSONL data files
 */

const DataLoader = {
    /**
     * Load JSONL file and parse into array of objects
     * @param {string} filename - Name of the JSONL file in the data directory
     * @returns {Promise<Array>} Array of parsed JSON objects
     */
    async loadJSONL(filename) {
        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.statusText}`);
            }
            
            const text = await response.text();
            if (!text.trim()) {
                console.warn(`File ${filename} is empty`);
                return [];
            }
            
            // Parse JSONL - one JSON object per line
            const lines = text.trim().split('\n');
            const data = lines
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        console.error(`Error parsing line in ${filename}:`, e);
                        return null;
                    }
                })
                .filter(obj => obj !== null);
            
            console.log(`Loaded ${data.length} items from ${filename}`);
            return data;
            
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            throw error;
        }
    },
    
    /**
     * Load all IAM data files
     * @returns {Promise<Object>} Object containing all loaded data
     */
    async loadAllData() {
        const results = {
            applications: [],
            applicationDetails: [],
            federations: [],
            mfaConfigurations: [],
            attributes: []
        };
        
        // Load each file, but don't fail if a file doesn't exist
        const loadFile = async (filename, key) => {
            try {
                results[key] = await this.loadJSONL(filename);
            } catch (error) {
                console.warn(`Could not load ${filename}, using empty array`);
                results[key] = [];
            }
        };
        
        await Promise.all([
            loadFile('applications.jsonl', 'applications'),
            loadFile('application_details.jsonl', 'applicationDetails'),
            loadFile('federations.jsonl', 'federations'),
            loadFile('mfa_configurations.jsonl', 'mfaConfigurations'),
            loadFile('attributes.jsonl', 'attributes')
        ]);
        
        return results;
    },
    
    /**
     * Extract data from wrapped JSONL format
     * @param {Array} wrappedData - Array of objects with 'data' property
     * @returns {Array} Extracted data objects
     */
    extractData(wrappedData) {
        return wrappedData.map(item => item.data || item);
    },
    
    /**
     * Get summary statistics from loaded data
     * @param {Object} data - Object containing all loaded data
     * @returns {Object} Summary statistics
     */
    getSummary(data) {
        return {
            totalApplications: data.applications.length,
            totalFederations: data.federations.length,
            totalMfaMethods: data.mfaConfigurations.length,
            totalAttributes: data.attributes.length,
            lastUpdate: this.getLastUpdateTime(data)
        };
    },
    
    /**
     * Get the most recent update time from all data
     * @param {Object} data - Object containing all loaded data
     * @returns {Date|null} Most recent update time
     */
    getLastUpdateTime(data) {
        const timestamps = [];
        
        // Collect all timestamps
        Object.values(data).forEach(items => {
            items.forEach(item => {
                if (item.fetch_timestamp) {
                    timestamps.push(new Date(item.fetch_timestamp));
                }
            });
        });
        
        if (timestamps.length === 0) return null;
        
        // Return the most recent timestamp
        return new Date(Math.max(...timestamps));
    },
    
    /**
     * Group applications by category or type
     * @param {Array} applications - Array of application objects
     * @returns {Object} Grouped applications
     */
    groupByCategory(applications) {
        const grouped = {};
        
        applications.forEach(app => {
            const appData = app.data || app;
            const category = appData.category || appData.type || 'Uncategorized';
            
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(appData);
        });
        
        return grouped;
    },
    
    /**
     * Filter data based on search term
     * @param {Array} data - Array of data objects
     * @param {string} searchTerm - Search term
     * @param {Array<string>} searchFields - Fields to search in
     * @returns {Array} Filtered data
     */
    filterData(data, searchTerm, searchFields = ['name', 'id', 'type']) {
        if (!searchTerm) return data;
        
        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            const obj = item.data || item;
            return searchFields.some(field => {
                const value = obj[field];
                return value && String(value).toLowerCase().includes(term);
            });
        });
    }
};

// Export for use in other modules
window.DataLoader = DataLoader;
