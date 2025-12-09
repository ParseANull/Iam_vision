/**
 * Visualizations Module
 * D3.js visualizations for IAM data
 */

const Visualizations = {
    /**
     * Create a treemap visualization for application categories
     * @param {string} containerId - ID of container element
     * @param {Object} data - Grouped application data
     */
    createTreemap(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = container.offsetWidth;
        const width = containerWidth > 0 ? containerWidth : 800;
        const height = 300;
        
        // Create hierarchy from data
        const hierarchy = {
            name: 'Applications',
            children: Object.entries(data).map(([category, apps]) => ({
                name: category,
                value: apps.length,
                apps: apps
            }))
        };
        
        if (hierarchy.children.length === 0) {
            this.showEmptyState(container, 'No application data available');
            return;
        }
        
        const root = d3.hierarchy(hierarchy)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        
        const treemap = d3.treemap()
            .size([width, height])
            .padding(2)
            .round(true);
        
        treemap(root);
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('max-width', '100%')
            .style('height', 'auto');
        
        // Color scale - use environment colors if available
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const useEnvColors = window.EnvironmentColors && window.AppState && 
                             window.AppState.selectedEnvironments && 
                             window.AppState.selectedEnvironments.length > 1;
        
        // Create tooltip
        const tooltip = this.createTooltip();
        
        // Create cells
        const cell = svg.selectAll('g')
            .data(root.leaves())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        cell.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => {
                // If apps have environment info and we're in multi-env mode, use env colors
                if (useEnvColors && d.data.apps && d.data.apps[0] && d.data.apps[0]._environmentId) {
                    // Use color from first app in category (categories may have mixed envs)
                    return window.EnvironmentColors.getColor(d.data.apps[0]._environmentId);
                }
                // Otherwise use category colors
                return color(d.parent.data.name);
            })
            .attr('opacity', 0.7)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                
                // Check if we have environment info
                let envInfo = '';
                if (d.data.apps && d.data.apps[0] && d.data.apps[0]._environmentName) {
                    const uniqueEnvs = [...new Set(d.data.apps.map(app => app._environmentName))];
                    envInfo = `<p><strong>Environment${uniqueEnvs.length > 1 ? 's' : ''}:</strong> ${uniqueEnvs.join(', ')}</p>`;
                }
                
                tooltip.style('display', 'block')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(`
                        <h4>${d.parent.data.name}</h4>
                        <p><strong>Applications:</strong> ${d.value}</p>
                        ${envInfo}
                    `);
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.7);
                tooltip.style('display', 'none');
            });
        
        // Add text labels
        cell.append('text')
            .selectAll('tspan')
            .data(d => [d.parent.data.name, d.value])
            .join('tspan')
            .attr('x', 4)
            .attr('y', (d, i) => 16 + i * 14)
            .attr('fill', 'white')
            .attr('font-size', (d, i) => i === 0 ? '12px' : '10px')
            .attr('font-weight', (d, i) => i === 0 ? 'bold' : 'normal')
            .text(d => d);
    },
    
    /**
     * Create a bar chart for MFA adoption rates
     * @param {string} containerId - ID of container element
     * @param {Array} data - MFA configuration data
     */
    createMFAChart(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            this.showEmptyState(container, 'No MFA data available');
            return;
        }
        
        // Extract MFA methods
        const methods = {};
        data.forEach(item => {
            const methodData = item.data || item;
            const methodType = methodData.type || methodData.method || 'Unknown';
            methods[methodType] = (methods[methodType] || 0) + 1;
        });
        
        const methodArray = Object.entries(methods).map(([name, count]) => ({
            name,
            count
        }));
        
        const containerWidth = container.offsetWidth;
        const margin = { top: 20, right: 30, bottom: 60, left: 60 };
        const width = (containerWidth > 0 ? containerWidth : 800) - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .style('max-width', '100%')
            .style('height', 'auto')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Scales
        const x = d3.scaleBand()
            .domain(methodArray.map(d => d.name))
            .range([0, width])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(methodArray, d => d.count)])
            .nice()
            .range([height, 0]);
        
        // Create tooltip
        const tooltip = this.createTooltip();
        
        // Bars
        svg.selectAll('.bar')
            .data(methodArray)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.name))
            .attr('y', d => y(d.count))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.count))
            .attr('fill', '#0f62fe')
            .on('mouseover', function(event, d) {
                tooltip.style('display', 'block')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(`
                        <h4>${d.name}</h4>
                        <p><strong>Count:</strong> ${d.count}</p>
                    `);
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.style('display', 'none');
            });
        
        // X Axis
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        
        // Y Axis
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
    },
    
    /**
     * Create a network graph for application relationships
     * @param {string} containerId - ID of container element
     * @param {Array} applications - Application data
     * @param {Array} details - Application details with relationships
     */
    createNetworkGraph(containerId, applications, details) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!applications || applications.length === 0) {
            this.showEmptyState(container, 'No application data available');
            return;
        }
        
        const containerWidth = container.offsetWidth;
        const width = containerWidth > 0 ? containerWidth : 1200;
        const height = 500;
        
        // Create nodes from applications
        const nodes = applications.slice(0, 50).map((app, i) => {
            const appData = app.data || app;
            return {
                id: appData.id || `app-${i}`,
                name: appData.name || `Application ${i}`,
                type: appData.type || 'application',
                data: appData
            };
        });
        
        // Create some example links (in reality, these would come from the data)
        const links = [];
        for (let i = 0; i < Math.min(nodes.length - 1, 20); i++) {
            links.push({
                source: nodes[i].id,
                target: nodes[i + 1].id
            });
        }
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('max-width', '100%')
            .style('height', 'auto');
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));
        
        // Create tooltip
        const tooltip = this.createTooltip();
        
        // Draw links
        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .attr('stroke-width', 2);
        
        // Check if using environment colors
        const useEnvColors = window.EnvironmentColors && window.AppState && 
                             window.AppState.selectedEnvironments && 
                             window.AppState.selectedEnvironments.length > 1;
        
        // Draw nodes
        const node = svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('class', 'node')
            .attr('r', 8)
            .attr('fill', d => {
                if (useEnvColors && d.data._environmentId) {
                    return window.EnvironmentColors.getColor(d.data._environmentId);
                }
                return '#0f62fe';
            })
            .call(this.drag(simulation))
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 12);
                
                let envInfo = '';
                if (d.data._environmentName) {
                    envInfo = `<p><strong>Environment:</strong> ${d.data._environmentName}</p>`;
                }
                
                tooltip.style('display', 'block')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(`
                        <h4>${d.name}</h4>
                        <p><strong>Type:</strong> ${d.type}</p>
                        <p><strong>ID:</strong> ${d.id}</p>
                        ${envInfo}
                    `);
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 8);
                tooltip.style('display', 'none');
            });
        
        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });
    },
    
    /**
     * Create a timeline visualization for federations
     * @param {string} containerId - ID of container element
     * @param {Array} data - Federation data
     */
    createTimeline(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            this.showEmptyState(container, 'No federation data available');
            return;
        }
        
        // Extract timeline data
        const timelineData = data.map((item, i) => {
            const fedData = item.data || item;
            return {
                name: fedData.name || `Federation ${i}`,
                date: new Date(item.fetch_timestamp || Date.now()),
                type: fedData.protocol || fedData.type || 'Unknown'
            };
        }).sort((a, b) => a.date - b.date);
        
        const containerWidth = container.offsetWidth;
        const margin = { top: 40, right: 30, bottom: 60, left: 100 };
        const width = (containerWidth > 0 ? containerWidth : 1200) - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .style('max-width', '100%')
            .style('height', 'auto')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(timelineData, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleBand()
            .domain(timelineData.map(d => d.name))
            .range([0, height])
            .padding(0.3);
        
        // Create tooltip
        const tooltip = this.createTooltip();
        
        // Timeline items
        svg.selectAll('circle')
            .data(timelineData)
            .join('circle')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.name) + y.bandwidth() / 2)
            .attr('r', 6)
            .attr('fill', '#0f62fe')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 10);
                tooltip.style('display', 'block')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(`
                        <h4>${d.name}</h4>
                        <p><strong>Type:</strong> ${d.type}</p>
                        <p><strong>Date:</strong> ${d.date.toLocaleDateString()}</p>
                    `);
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 6);
                tooltip.style('display', 'none');
            });
        
        // X Axis
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        // Y Axis
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
    },
    
    /**
     * Create tooltip element
     * @returns {Object} D3 selection of tooltip
     */
    createTooltip() {
        let tooltip = d3.select('body').select('.tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('display', 'none');
        }
        return tooltip;
    },
    
    /**
     * Show empty state message
     * @param {HTMLElement} container - Container element
     * @param {string} message - Message to display
     */
    showEmptyState(container, message) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M26 6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM6 24V8h20v16z"/>
                </svg>
                <h3>${message}</h3>
                <p>Run the Python data collection scripts to populate the visualizations.</p>
            </div>
        `;
    },
    
    /**
     * Create drag behavior for force simulation
     * @param {Object} simulation - D3 force simulation
     * @returns {Function} Drag behavior
     */
    drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
};

// Export for use in other modules
window.Visualizations = Visualizations;
