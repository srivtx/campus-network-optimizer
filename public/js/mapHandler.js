/**
 * MapHandler class - Manages the map and interactive elements
 */
class MapHandler {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = new Map(); // To store markers by node ID
        this.polylines = []; // To store connection lines
        this.mstPolylines = []; // To store MST polylines

        // Connection mode state
        this.mode = 'normal'; // 'normal' or 'connecting'
        this.activeNodeId = null;
        this.connectionLine = null;
        this.connectionTooltip = null;

        // Initialize and return the instance
        this.initializeMap();
    }

    /**
     * Initialize the map and event listeners
     */
    initializeMap() {
        console.log("Initializing map...");

        // Create Leaflet map instance
        this.map = L.map(this.containerId).setView([40.7128, -74.0060], 15);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Map click handler - For adding nodes or canceling connection mode
        this.map.on('click', (e) => {
            if (this.mode === 'connecting') {
                console.log("Map clicked while in connection mode - canceling");
                this.exitConnectionMode();
            } else {
                console.log("Map clicked - creating node event");
                const customEvent = new CustomEvent('map-click', {
                    detail: {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }
                });
                document.dispatchEvent(customEvent);
            }
        });

        // Global keyboard handler for Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mode === 'connecting') {
                console.log("ESC key pressed - exiting connection mode");
                this.exitConnectionMode();
            }
        });

        // Create status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'status-indicator';
        statusIndicator.className = 'map-status-indicator hidden';
        document.body.appendChild(statusIndicator);
        this.statusIndicator = statusIndicator;

        console.log("Map initialized successfully");
        return this;
    }

    /**
     * Enter connection mode after clicking on a building
     */
    enterConnectionMode(nodeId) {
        console.log(`Entering connection mode for node: ${nodeId}`);

        // Set mode state
        this.mode = 'connecting';
        this.activeNodeId = nodeId;

        // Find the marker
        const marker = this.markers.get(nodeId);
        if (!marker) {
            console.error(`Cannot enter connection mode: No marker found for node ${nodeId}`);
            return;
        }

        // Visual highlight for source building
        this.highlightMarker(nodeId);

        // Create preview connection line
        const startPoint = marker.getLatLng();
        this.connectionLine = L.polyline([startPoint, startPoint], {
            color: '#4285F4',
            weight: 3,
            opacity: 0.7,
            dashArray: '5,10'
        }).addTo(this.map);

        // Create distance tooltip
        this.connectionTooltip = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'connection-distance-tooltip'
        })
            .setContent('0 m')
            .setLatLng(startPoint)
            .addTo(this.map);

        // Add mouse move handler for preview line
        this.map.on('mousemove', this.handleMouseMove, this);

        // Change cursor style
        document.body.classList.add('connecting-mode');

        // Show status message
        this.showStatusMessage('Click another building to connect, or press ESC to cancel', 'info');

        // Update mode display
        document.dispatchEvent(new CustomEvent('mode-changed', {
            detail: { mode: 'connecting' }
        }));
    }

    /**
     * Handle mouse movement during connection mode
     */
    handleMouseMove(e) {
        if (this.mode !== 'connecting' || !this.connectionLine || !this.activeNodeId) return;

        const marker = this.markers.get(this.activeNodeId);
        if (!marker) return;

        const startPoint = marker.getLatLng();
        const mousePoint = e.latlng;

        // Update the preview line
        this.connectionLine.setLatLngs([startPoint, mousePoint]);

        // Calculate distance
        const distance = Math.round(startPoint.distanceTo(mousePoint));

        // Calculate midpoint for tooltip
        const midPoint = L.latLng(
            (startPoint.lat + mousePoint.lat) / 2,
            (startPoint.lng + mousePoint.lng) / 2
        );

        // Update tooltip content and position
        this.connectionTooltip.setContent(`${distance} m`);
        this.connectionTooltip.setLatLng(midPoint);
    }

    /**
     * Exit connection mode
     */
    exitConnectionMode() {
        console.log("Exiting connection mode");

        if (this.activeNodeId) {
            // Remove highlight from source building
            try {
                this.unhighlightMarker(this.activeNodeId);
            } catch (e) {
                console.warn("Error unhighlighting marker:", e);
            }
        }

        // Remove preview line
        if (this.connectionLine) {
            this.map.removeLayer(this.connectionLine);
            this.connectionLine = null;
        }

        // Remove distance tooltip
        if (this.connectionTooltip) {
            this.map.removeLayer(this.connectionTooltip);
            this.connectionTooltip = null;
        }

        // Remove mouse move handler
        this.map.off('mousemove', this.handleMouseMove, this);

        // Reset state
        const wasInConnectingMode = this.mode === 'connecting';
        this.mode = 'normal';
        this.activeNodeId = null;

        // Reset cursor
        document.body.classList.remove('connecting-mode');

        // Hide status message
        this.hideStatusMessage();

        // Update mode indicator only if we actually changed
        if (wasInConnectingMode) {
            document.dispatchEvent(new CustomEvent('mode-changed', {
                detail: { mode: 'normal' }
            }));
        }
    }

    /**
     * Complete a connection between two buildings
     */
    completeConnection(targetNodeId) {
        console.log(`Completing connection: ${this.activeNodeId} -> ${targetNodeId}`);

        const sourceNodeId = this.activeNodeId;

        // Validate both source and target exist
        if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
            console.warn("Invalid connection attempt");
            this.exitConnectionMode();
            return;
        }

        const sourceMarker = this.markers.get(sourceNodeId);
        const targetMarker = this.markers.get(targetNodeId);

        if (!sourceMarker || !targetMarker) {
            console.error("Source or target marker not found");
            this.exitConnectionMode();
            return;
        }

        // Calculate distance between buildings
        const sourcePoint = sourceMarker.getLatLng();
        const targetPoint = targetMarker.getLatLng();
        const distance = Math.round(sourcePoint.distanceTo(targetPoint));

        // Create connection event
        const event = new CustomEvent('building-connection-created', {
            detail: {
                source: sourceNodeId,
                target: targetNodeId,
                weight: distance
            }
        });

        // Dispatch the event for main.js to handle
        document.dispatchEvent(event);

        // Exit connection mode
        this.exitConnectionMode();

        // Show success message
        this.showStatusMessage(`Connected buildings with distance: ${distance} meters`, 'success');
    }

    /**
     * Add a marker for a building
     * FIXED: Better marker handling
     */
    addMarker(node) {
        console.log(`Adding marker for node: ${node.id} (${node.name})`);

        try {
            // Create a regular Leaflet marker
            const marker = L.marker([node.lat, node.lng], {
                draggable: true,
                title: node.name
            });

            // Create custom icon with unique ID
            const markerHtml = `
                <div class="building-marker" 
                     id="building-marker-${node.id}" 
                     data-node-id="${node.id}">
                </div>
            `;

            const icon = L.divIcon({
                html: markerHtml,
                className: 'building-marker-wrapper',
                iconSize: [18, 18]
            });

            marker.setIcon(icon);
            marker.addTo(this.map);

            // Add permanent tooltip for building name
            marker.bindTooltip(node.name, {
                permanent: true,
                direction: 'top',
                className: 'building-label'
            });

            // Add a reference to the node ID for easier lookup
            marker.nodeId = node.id;

            // Handle drag events
            marker.on('dragend', (e) => {
                const latlng = marker.getLatLng();
                const event = new CustomEvent('marker-moved', {
                    detail: {
                        id: node.id,
                        lat: latlng.lat,
                        lng: latlng.lng
                    }
                });
                document.dispatchEvent(event);
            });

            // FIXED: Better click handling with debugger logging
            marker.on('click', (e) => {
                console.log(`Marker clicked: ${node.id}`);

                // Stop event propagation
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);

                // Handle connection logic
                if (this.mode === 'normal') {
                    console.log(`Starting connection from node: ${node.id}`);
                    this.enterConnectionMode(node.id);
                } else if (this.mode === 'connecting' && this.activeNodeId !== node.id) {
                    console.log(`Completing connection to node: ${node.id}`);
                    this.completeConnection(node.id);
                }
            });

            // Store in markers map
            this.markers.set(node.id, marker);

            return marker;

        } catch (error) {
            console.error("Error adding marker:", error);
            return null;
        }
    }

    /**
     * Highlight a marker visually
     * FIXED: Better highlighting
     */
    highlightMarker(nodeId) {
        console.log(`Highlighting marker: ${nodeId}`);

        // Try first approach: find DOM element by ID
        const markerElement = document.getElementById(`building-marker-${nodeId}`);

        if (markerElement) {
            markerElement.classList.add('active');
        } else {
            console.warn(`Could not find marker element by ID, trying alternative approach`);

            // Alternative approach: recreate the marker icon with active class
            const marker = this.markers.get(nodeId);
            if (marker) {
                const markerHtml = `
                    <div class="building-marker active" 
                         id="building-marker-${nodeId}" 
                         data-node-id="${nodeId}">
                    </div>
                `;

                marker.setIcon(L.divIcon({
                    html: markerHtml,
                    className: 'building-marker-wrapper',
                    iconSize: [18, 18]
                }));
            } else {
                console.error(`Could not highlight marker: ${nodeId} - not found`);
            }
        }
    }

    /**
     * Remove highlight from a marker
     */
    unhighlightMarker(nodeId) {
        console.log(`Unhighlighting marker: ${nodeId}`);

        // Try first approach: find DOM element by ID
        const markerElement = document.getElementById(`building-marker-${nodeId}`);

        if (markerElement) {
            markerElement.classList.remove('active');
        } else {
            console.warn(`Could not find marker element by ID, trying alternative approach`);

            // Alternative approach: recreate the marker icon without active class
            const marker = this.markers.get(nodeId);
            if (marker) {
                const markerHtml = `
                    <div class="building-marker" 
                         id="building-marker-${nodeId}" 
                         data-node-id="${nodeId}">
                    </div>
                `;

                marker.setIcon(L.divIcon({
                    html: markerHtml,
                    className: 'building-marker-wrapper',
                    iconSize: [18, 18]
                }));
            }
        }
    }

    /**
     * Show a status message
     */
    showStatusMessage(message, type = 'info') {
        if (!this.statusIndicator) {
            console.warn("Status indicator not found");
            return;
        }

        console.log(`Status message (${type}): ${message}`);

        this.statusIndicator.textContent = message;
        this.statusIndicator.className = `map-status-indicator ${type}`;

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (this.statusIndicator.classList.contains('success')) {
                    this.hideStatusMessage();
                }
            }, 3000);
        }
    }

    /**
     * Hide the status message
     */
    hideStatusMessage() {
        if (this.statusIndicator) {
            this.statusIndicator.className = 'map-status-indicator hidden';
        }
    }

    /**
     * Add a connection line between two markers
     */
    addConnection(edge, isMST = false) {
        const sourceMarker = this.markers.get(edge.source);
        const targetMarker = this.markers.get(edge.target);

        if (sourceMarker && targetMarker) {
            const sourceLatLng = sourceMarker.getLatLng();
            const targetLatLng = targetMarker.getLatLng();

            // Create polyline
            const polyline = L.polyline(
                [sourceLatLng, targetLatLng],
                {
                    color: isMST ? '#ff6600' : '#999',
                    weight: isMST ? 4 : 2,
                    opacity: isMST ? 0.8 : 0.5,
                    dashArray: isMST ? null : '5, 5'
                }
            ).addTo(this.map);

            // Add weight label
            const midpoint = L.latLng(
                (sourceLatLng.lat + targetLatLng.lat) / 2,
                (sourceLatLng.lng + targetLatLng.lng) / 2
            );

            const label = L.marker(midpoint, {
                icon: L.divIcon({
                    html: `<div class="edge-weight">${edge.weight}</div>`,
                    className: 'edge-weight-wrapper',
                    iconSize: [40, 20]
                })
            }).addTo(this.map);

            // Store polyline reference
            if (isMST) {
                this.mstPolylines.push({ line: polyline, label: label, edge: edge });
            } else {
                this.polylines.push({ line: polyline, label: label, edge: edge });
            }

            return true;
        }
        return false;
    }

    /**
     * Update map with nodes and edges
     */
    updateMap(nodes, edges, mst = []) {
        console.log("Updating map with:", {
            nodes: nodes.length,
            edges: edges.length,
            mst: mst.length
        });

        // If we're in connection mode, exit it
        if (this.mode === 'connecting') {
            this.exitConnectionMode();
        }

        // Clear existing connections
        this.clearConnections();

        // Update or add markers for all nodes
        nodes.forEach(node => {
            if (!node.lat || !node.lng) {
                console.warn(`Node ${node.id} skipped - missing coordinates`);
                return;
            }

            if (this.markers.has(node.id)) {
                // Update existing marker
                const marker = this.markers.get(node.id);
                marker.setLatLng([node.lat, node.lng]);
                marker.setTooltipContent(node.name);
            } else {
                // Add new marker
                this.addMarker(node);
            }
        });

        // Remove markers for deleted nodes
        this.markers.forEach((marker, nodeId) => {
            if (!nodes.find(n => n.id === nodeId)) {
                this.removeMarker(nodeId);
            }
        });

        // Add regular connections
        edges.forEach(edge => {
            this.addConnection(edge, false);
        });

        // Add MST connections
        mst.forEach(edge => {
            this.addConnection(edge, true);
        });

        // Fit map to show all markers if we have any
        if (this.markers.size > 0) {
            const markerBounds = [];
            this.markers.forEach(marker => {
                markerBounds.push(marker.getLatLng());
            });
            this.map.fitBounds(L.latLngBounds(markerBounds), { padding: [50, 50] });
        }
    }

    /**
     * Clear all connections (keeps markers)
     */
    clearConnections() {
        // Remove regular polylines
        this.polylines.forEach(item => {
            this.map.removeLayer(item.line);
            this.map.removeLayer(item.label);
        });
        this.polylines = [];

        // Remove MST polylines
        this.mstPolylines.forEach(item => {
            this.map.removeLayer(item.line);
            this.map.removeLayer(item.label);
        });
        this.mstPolylines = [];
    }

    /**
     * Remove a marker
     */
    removeMarker(nodeId) {
        console.log(`Removing marker: ${nodeId}`);

        const marker = this.markers.get(nodeId);
        if (marker) {
            this.map.removeLayer(marker);
            this.markers.delete(nodeId);
        }
    }

    /**
     * Calculate distance between two points in meters
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const p1 = L.latLng(lat1, lng1);
        const p2 = L.latLng(lat2, lng2);
        return p1.distanceTo(p2);
    }

    /**
     * Set map to a specific location
     */
    setMapLocation(lat, lng, zoom = 15) {
        this.map.setView([lat, lng], zoom);
    }

    /**
     * Helper to geocode an address (search for a location)
     */
    geocodeAddress(address, callback) {
        console.log(`Searching for location: "${address}"`);

        // Using Nominatim API (free OpenStreetMap geocoding)
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const location = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                        display_name: data[0].display_name
                    };
                    console.log(`Found location: ${location.display_name}`);
                    callback(location, null);
                } else {
                    console.warn("Location not found");
                    callback(null, new Error("Location not found"));
                }
            })
            .catch(error => {
                console.error("Error searching for location:", error);
                callback(null, error);
            });
    }

    /**
     * Force connection mode for testing
     */
    forceConnectionMode(nodeId) {
        // Find first node if none specified
        if (!nodeId && this.markers.size > 0) {
            nodeId = Array.from(this.markers.keys())[0];
        }

        if (nodeId) {
            console.log(`Forcing connection mode for node: ${nodeId}`);
            this.enterConnectionMode(nodeId);
            return true;
        }

        console.error("Cannot force connection mode: No nodes available");
        return false;
    }
}