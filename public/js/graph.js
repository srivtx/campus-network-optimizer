class GraphVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth || 800;
        this.height = this.container.clientHeight || 600;
        this.nodes = [];
        this.edges = [];
        this.mst = [];

        // Clear previous SVG if it exists
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // Create SVG element
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.style.backgroundColor = "#f9f9f9";
        this.container.appendChild(this.svg);

        // Create a group for all graph elements
        this.g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.svg.appendChild(this.g);

        // Initialize D3 force simulation
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .on("tick", () => this.updatePositions());

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                d3.select(this.g).attr("transform", event.transform);
            });

        d3.select(this.svg).call(zoom);

        // Add click event for node creation
        d3.select(this.svg).on("click", (event) => {
            if (event.target === this.svg) {
                const point = d3.pointer(event);
                const customEvent = new CustomEvent("map-click", {
                    detail: { x: point[0], y: point[1] }
                });
                document.dispatchEvent(customEvent);
            }
        });

        console.log("Graph visualizer initialized with dimensions:", this.width, "x", this.height);
    }

    updateData(nodes, edges, mst = []) {
        console.log("Updating graph data:", { nodes, edges, mst });
        this.nodes = JSON.parse(JSON.stringify(nodes)); // Deep copy
        this.edges = JSON.parse(JSON.stringify(edges)); // Deep copy
        this.mst = JSON.parse(JSON.stringify(mst));     // Deep copy

        // Ensure nodes have initial positions
        this.nodes.forEach(node => {
            if (!node.x) node.x = Math.random() * this.width;
            if (!node.y) node.y = Math.random() * this.height;
        });

        this.render();
    }

    render() {
        console.log("Rendering graph with", this.nodes.length, "nodes and", this.edges.length, "edges");

        // Update force simulation with new data
        this.simulation.nodes(this.nodes);
        this.simulation.force("link").links(this.edges);

        // Create D3 selections
        const svg = d3.select(this.svg);
        const g = d3.select(this.g);

        // Remove existing elements
        g.selectAll("*").remove();

        // Create edge groups
        const linkGroups = g.selectAll(".link")
            .data(this.edges)
            .enter()
            .append("g")
            .attr("class", "link");

        // Add lines to edge groups
        linkGroups.append("line")
            .attr("stroke", d => {
                // Check if this edge is in MST
                const inMst = this.mst.some(e =>
                    (e.source === d.source && e.target === d.target) ||
                    (e.source === d.target && e.target === d.source));
                return inMst ? "#ff6600" : "#999";
            })
            .attr("stroke-width", d => {
                const inMst = this.mst.some(e =>
                    (e.source === d.source && e.target === d.target) ||
                    (e.source === d.target && e.target === d.source));
                return inMst ? 3 : 1;
            });

        // Add weight labels to edges
        linkGroups.append("text")
            .attr("fill", "#333")
            .attr("text-anchor", "middle")
            .attr("dy", -5)
            .text(d => d.weight);

        // Create node groups
        const nodeGroups = g.selectAll(".node")
            .data(this.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", (event, d) => this.dragStarted(event, d))
                .on("drag", (event, d) => this.dragged(event, d))
                .on("end", (event, d) => this.dragEnded(event, d)));

        // Add circles to node groups
        nodeGroups.append("circle")
            .attr("r", 12)
            .attr("fill", "#69b3a2")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add labels to nodes
        nodeGroups.append("text")
            .attr("fill", "#000")
            .attr("text-anchor", "middle")
            .attr("dy", -20)
            .text(d => d.name);

        // Restart simulation
        this.simulation.alpha(1).restart();
    }

    updatePositions() {
        // Update edge positions
        d3.select(this.g).selectAll(".link line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        // Update edge label positions
        d3.select(this.g).selectAll(".link text")
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        // Update node positions
        d3.select(this.g).selectAll(".node")
            .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}