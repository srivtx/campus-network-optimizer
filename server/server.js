const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Route to process network data and run Kruskal's algorithm
app.post('/api/optimize', (req, res) => {
    try {
        const { nodes, edges } = req.body;

        // Create a mapping of node IDs to indices
        const nodeMap = {};
        nodes.forEach((node, index) => {
            nodeMap[node.id] = index;
        });

        // Implementation of Kruskal's algorithm
        // Sort edges by weight
        const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);

        // Initialize disjoint set
        const parent = Array(nodes.length).fill().map((_, i) => i);
        const rank = Array(nodes.length).fill(0);

        // Find operation with path compression
        function find(x) {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]);
            }
            return parent[x];
        }

        // Union operation with rank
        function union(x, y) {
            const rootX = find(x);
            const rootY = find(y);

            if (rootX === rootY) return;

            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }
        }

        // Process edges to build MST
        const minimumSpanningTree = [];
        let totalCost = 0;

        for (const edge of sortedEdges) {
            const sourceIndex = nodeMap[edge.source];
            const targetIndex = nodeMap[edge.target];

            // If including this edge doesn't create a cycle
            if (find(sourceIndex) !== find(targetIndex)) {
                // Add edge to MST
                minimumSpanningTree.push({ ...edge });

                // Add to total cost
                totalCost += parseInt(edge.weight);

                // Union the sets
                union(sourceIndex, targetIndex);
            }
        }

        res.json({
            minimumSpanningTree,
            totalCost
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// Catch-all route to return the main HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});