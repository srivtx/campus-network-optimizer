// Global variables
let nodes = [];
let edges = [];
let mst = [];
let mapHandler;

// DOM element references
let nodesList, sourceNodeSelect, targetNodeSelect, edgesList, resultsDiv, totalCostSpan, mstList;

/**
 * Add a node at a specific map location
 */
function addNodeAtLocation(lat, lng) {
    const nodeNameInput = document.getElementById('nodeName');
    const name = nodeNameInput.value.trim() || `Building ${nodes.length + 1}`;

    const node = {
        id: Date.now().toString(),
        name: name,
        lat: lat,
        lng: lng
    };

    console.log(`Adding node at location: ${lat}, ${lng} - ${name}`);

    nodes.push(node);
    updateNodesList();
    updateNodeSelects();
    updateMap();

    // Clear input
    nodeNameInput.value = '';
}

/**
 * Update the map with current data
 */
function updateMap() {
    console.log("Updating map with:", {
        nodes: nodes.length,
        edges: edges.length,
        mst: mst.length
    });

    if (!mapHandler) {
        console.error("Map handler not initialized!");
        return;
    }

    mapHandler.updateMap(nodes, edges, mst);
}

/**
 * Update nodes list in UI
 */
function updateNodesList() {
    if (!nodesList) nodesList = document.getElementById('nodesList');
    if (!nodesList) {
        console.error("nodesList element not found!");
        return;
    }

    nodesList.innerHTML = '';

    nodes.forEach(node => {
        const li = document.createElement('li');
        li.textContent = `${node.name} (ID: ${node.id})`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteNode(node.id));

        li.appendChild(deleteBtn);
        nodesList.appendChild(li);
    });
}

/**
 * Update node selects for connections
 */
function updateNodeSelects() {
    if (!sourceNodeSelect) sourceNodeSelect = document.getElementById('sourceNode');
    if (!targetNodeSelect) targetNodeSelect = document.getElementById('targetNode');

    if (!sourceNodeSelect || !targetNodeSelect) {
        console.error("Node select elements not found!");
        return;
    }

    sourceNodeSelect.innerHTML = '<option value="">Select Source Building</option>';
    targetNodeSelect.innerHTML = '<option value="">Select Target Building</option>';

    nodes.forEach(node => {
        const sourceOption = document.createElement('option');
        sourceOption.value = node.id;
        sourceOption.textContent = node.name;
        sourceNodeSelect.appendChild(sourceOption);

        const targetOption = document.createElement('option');
        targetOption.value = node.id;
        targetOption.textContent = node.name;
        targetNodeSelect.appendChild(targetOption);
    });
}

/**
 * Update edges list in UI
 */
function updateEdgesList() {
    if (!edgesList) edgesList = document.getElementById('edgesList');
    if (!edgesList) {
        console.error("edgesList element not found!");
        return;
    }

    edgesList.innerHTML = '';

    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) {
            console.warn(`Could not find nodes for edge: ${edge.id}`);
            return;
        }

        const li = document.createElement('li');
        li.textContent = `${sourceNode.name} to ${targetNode.name}: Cost ${edge.weight}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteEdge(edge.id));

        li.appendChild(deleteBtn);
        edgesList.appendChild(li);
    });
}

/**
 * Delete a node
 */
function deleteNode(id) {
    nodes = nodes.filter(node => node.id !== id);

    // Remove all edges connected to this node
    edges = edges.filter(edge => edge.source !== id && edge.target !== id);

    // Update UI
    updateNodesList();
    updateNodeSelects();
    updateEdgesList();
    updateMap();

    // Hide results if showing
    if (resultsDiv) resultsDiv.classList.add('hidden');
}

/**
 * Delete an edge
 */
function deleteEdge(id) {
    edges = edges.filter(edge => edge.id !== id);

    // Update UI
    updateEdgesList();
    updateMap();

    // Hide results if showing
    if (resultsDiv) resultsDiv.classList.add('hidden');
}

/**
 * Add a node manually (from input field)
 */
function addNode() {
    const nodeNameInput = document.getElementById('nodeName');
    const name = nodeNameInput.value.trim();

    if (!name) {
        alert('Please enter a building name');
        return;
    }

    // If map is initialized, add node at center of current view
    if (mapHandler && mapHandler.map) {
        const center = mapHandler.map.getCenter();
        addNodeAtLocation(center.lat, center.lng);
    } else {
        alert('Map is not initialized. Cannot add node.');
    }
}

/**
 * Add an edge between two nodes using the form
 */
function addEdge() {
    const sourceNodeId = document.getElementById('sourceNode').value;
    const targetNodeId = document.getElementById('targetNode').value;
    const edgeWeightInput = document.getElementById('edgeWeight');

    if (!sourceNodeId || !targetNodeId) {
        alert('Please select source and target buildings');
        return;
    }

    if (sourceNodeId === targetNodeId) {
        alert('Source and target buildings cannot be the same');
        return;
    }

    // Check if edge already exists
    const edgeExists = edges.some(edge =>
        (edge.source === sourceNodeId && edge.target === targetNodeId) ||
        (edge.source === targetNodeId && edge.target === sourceNodeId)
    );

    if (edgeExists) {
        alert('A connection between these buildings already exists');
        return;
    }

    // Find the nodes
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
        alert('Selected buildings not found');
        return;
    }

    // Calculate distance or use manual input
    let weight;
    if (edgeWeightInput.value.trim()) {
        // Use manual weight if provided
        weight = parseInt(edgeWeightInput.value);
        if (!weight || weight <= 0) {
            alert('Please enter a valid cost (greater than 0)');
            return;
        }
    } else {
        // Calculate distance automatically (in meters, rounded)
        weight = Math.round(mapHandler.calculateDistance(
            sourceNode.lat, sourceNode.lng,
            targetNode.lat, targetNode.lng
        ));

        // Show the calculated weight
        edgeWeightInput.value = weight;
    }

    createConnectionBetweenBuildings(sourceNodeId, targetNodeId, weight);

    // Clear inputs
    document.getElementById('sourceNode').value = '';
    document.getElementById('targetNode').value = '';
    edgeWeightInput.value = '';
}

/**
 * Create connection between buildings
 */
function createConnectionBetweenBuildings(sourceId, targetId, weight) {
    console.log(`Creating connection: ${sourceId} -> ${targetId}, weight: ${weight}`);

    // Validate nodes exist
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) {
        console.error("Source or target node not found");
        return false;
    }

    // Check if connection already exists
    const connectionExists = edges.some(edge =>
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    );

    if (connectionExists) {
        mapHandler.showStatusMessage(`Connection between ${sourceNode.name} and ${targetNode.name} already exists`, 'error');
        return false;
    }

    // Create the new edge
    const edge = {
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        weight: weight
    };

    // Add to edges array
    edges.push(edge);

    // Update UI
    updateEdgesList();
    updateMap();

    // Hide results if showing
    if (resultsDiv) resultsDiv.classList.add('hidden');

    return true;
}

/**
 * Run Kruskal's algorithm to find MST
 */
function optimizeNetwork() {
    if (nodes.length < 2) {
        alert('Please add at least 2 buildings');
        return;
    }

    if (edges.length < 1) {
        alert('Please add at least 1 connection');
        return;
    }

    // Run Kruskal's algorithm
    const result = runKruskalsAlgorithm(nodes, edges);
    mst = result.minimumSpanningTree;

    // Show results
    if (!totalCostSpan) totalCostSpan = document.getElementById('totalCost');
    if (!mstList) mstList = document.getElementById('mstList');
    if (!resultsDiv) resultsDiv = document.getElementById('results');

    if (totalCostSpan) totalCostSpan.textContent = result.totalCost;

    if (mstList) {
        mstList.innerHTML = '';
        mst.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (sourceNode && targetNode) {
                const li = document.createElement('li');
                li.textContent = `${sourceNode.name} to ${targetNode.name}: Cost ${edge.weight}`;
                mstList.appendChild(li);
            }
        });
    }

    if (resultsDiv) resultsDiv.classList.remove('hidden');
    updateMap();

    mapHandler.showStatusMessage(`Optimization complete: Total cost ${result.totalCost}`, 'success');
}

/**
 * Clear all data
 */
function clearAll() {
    if (confirm('Are you sure you want to clear all data?')) {
        nodes = [];
        edges = [];
        mst = [];

        updateNodesList();
        updateNodeSelects();
        updateEdgesList();
        updateMap();

        if (resultsDiv) resultsDiv.classList.add('hidden');

        mapHandler.showStatusMessage('All data cleared', 'info');
    }
}

/**
 * Load sample data with real coordinates
 */
function loadSampleData() {
    console.log("Loading sample data...");

    // Clear existing data
    nodes = [];
    edges = [];
    mst = [];

    // Add sample nodes with real coordinates (example: Columbia University campus)
    nodes = [
        { id: '1', name: 'Butler Library', lat: 40.8064, lng: -73.9631 },
        { id: '2', name: 'Low Memorial', lat: 40.8087, lng: -73.9624 },
        { id: '3', name: 'Pupin Hall', lat: 40.8100, lng: -73.9612 },
        { id: '4', name: 'Havemeyer Hall', lat: 40.8093, lng: -73.9620 },
        { id: '5', name: 'Uris Hall', lat: 40.8091, lng: -73.9605 }
    ];

    // Add sample edges with calculated weights
    edges = [
        { id: '1-2', source: '1', target: '2', weight: 250 },
        { id: '1-3', source: '1', target: '3', weight: 400 },
        { id: '2-3', source: '2', target: '3', weight: 180 },
        { id: '2-4', source: '2', target: '4', weight: 120 },
        { id: '3-4', source: '3', target: '4', weight: 100 },
        { id: '3-5', source: '3', target: '5', weight: 90 },
        { id: '4-5', source: '4', target: '5', weight: 150 }
    ];

    // Update UI
    updateNodesList();
    updateNodeSelects();
    updateEdgesList();
    updateMap();

    // Zoom map to fit these locations
    mapHandler.setMapLocation(40.8087, -73.9624, 16);

    // Hide results
    if (resultsDiv) resultsDiv.classList.add('hidden');

    mapHandler.showStatusMessage("Sample Columbia University campus data loaded!", 'success');
}

/**
 * Search for a location
 */
function searchLocation() {
    const address = document.getElementById('locationSearch').value;
    if (address.trim()) {
        // Show loading indicator
        document.getElementById('searchBtn').textContent = 'Searching...';
        document.getElementById('searchBtn').disabled = true;

        mapHandler.geocodeAddress(address, (location, error) => {
            // Reset button text
            document.getElementById('searchBtn').textContent = 'Search';
            document.getElementById('searchBtn').disabled = false;

            if (error) {
                mapHandler.showStatusMessage('Could not find that location.', 'error');
                return;
            }

            // Move map to the location
            mapHandler.setMapLocation(location.lat, location.lng, 17);
            mapHandler.showStatusMessage(`Found: ${location.display_name}`, 'success');
        });
    }
}

/**
 * Export network data
 */
function exportNetwork() {
    const data = {
        nodes,
        edges,
        mst,
        timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'campus-network.json');
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);

    mapHandler.showStatusMessage('Network data exported successfully', 'success');
}

/**
 * Import network data
 */
function importNetwork() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.nodes && data.edges) {
                    nodes = data.nodes;
                    edges = data.edges;
                    mst = data.mst || [];

                    updateNodesList();
                    updateNodeSelects();
                    updateEdgesList();
                    updateMap();

                    // If the data has nodes with coordinates, fit the map to them
                    if (nodes.length > 0 && nodes[0].lat && nodes[0].lng) {
                        mapHandler.setMapLocation(nodes[0].lat, nodes[0].lng, 16);
                    }

                    mapHandler.showStatusMessage(`Imported ${nodes.length} buildings and ${edges.length} connections`, 'success');
                } else {
                    mapHandler.showStatusMessage('Invalid data format', 'error');
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                mapHandler.showStatusMessage('Error importing data', 'error');
            }
        };
    };

    input.click();
}

/**
 * Test connection mode
 */
function testConnectionMode() {
    console.log("Testing connection mode...");

    // Make sure we have nodes to connect
    if (nodes.length < 1) {
        alert("Please add at least one node to test connection mode");
        return;
    }

    // Try to force connection mode on the first node
    const success = mapHandler.forceConnectionMode();

    if (success) {
        console.log("Connection mode test activated");
    } else {
        alert("Could not activate connection mode. Check console for details.");
    }
}

/**
 * Update UI based on mode
 */
function updateModeIndicator(mode) {
    const indicator = document.getElementById('mode-indicator');
    if (!indicator) return;

    const normalEl = indicator.querySelector('.mode-normal');
    const connectingEl = indicator.querySelector('.mode-connecting');

    if (mode === 'connecting') {
        normalEl.classList.remove('active');
        connectingEl.classList.add('active');
        console.log("Mode indicator updated: CONNECTING MODE");
    } else {
        normalEl.classList.add('active');
        connectingEl.classList.remove('active');
        console.log("Mode indicator updated: NORMAL MODE");
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Initializing app");

    // Initialize references to DOM elements
    nodesList = document.getElementById('nodesList');
    sourceNodeSelect = document.getElementById('sourceNode');
    targetNodeSelect = document.getElementById('targetNode');
    edgesList = document.getElementById('edgesList');
    resultsDiv = document.getElementById('results');
    totalCostSpan = document.getElementById('totalCost');
    mstList = document.getElementById('mstList');

    // Initialize map handler
    mapHandler = new MapHandler('mapContainer');

    // Set map to a default location
    mapHandler.setMapLocation(40.7128, -74.0060, 13); // NYC by default

    // Listen for map clicks to add nodes
    document.addEventListener('map-click', (event) => {
        const { lat, lng } = event.detail;
        addNodeAtLocation(lat, lng);
    });

    // Listen for marker drag events
    document.addEventListener('marker-moved', (event) => {
        const { id, lat, lng } = event.detail;
        // Update the node's position
        const nodeIndex = nodes.findIndex(n => n.id === id);
        if (nodeIndex >= 0) {
            nodes[nodeIndex].lat = lat;
            nodes[nodeIndex].lng = lng;

            // Update connections
            updateMap();
        }
    });

    // Listen for building connection events
    document.addEventListener('building-connection-created', (event) => {
        const { source, target, weight } = event.detail;
        createConnectionBetweenBuildings(source, target, weight);
    });

    // Listen for mode changes
    document.addEventListener('mode-changed', (event) => {
        updateModeIndicator(event.detail.mode);
    });

    // Set up event listeners for buttons
    document.getElementById('addNodeBtn').addEventListener('click', addNode);
    document.getElementById('addEdgeBtn').addEventListener('click', addEdge);
    document.getElementById('optimizeBtn').addEventListener('click', optimizeNetwork);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
    document.getElementById('exportBtn').addEventListener('click', exportNetwork);
    document.getElementById('importBtn').addEventListener('click', importNetwork);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnectionMode);

    // Setup search functionality
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchLocation);
    }

    // Add enter key support for search
    const searchInput = document.getElementById('locationSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchLocation();
            }
        });
    }

    console.log("App initialization complete");
    mapHandler.showStatusMessage("Welcome to Campus Network Optimizer! Click on the map to add buildings.", 'info');
    setTimeout(() => mapHandler.hideStatusMessage(), 5000);
});