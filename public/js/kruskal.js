/**
 * Disjoint Set (Union-Find) data structure
 */
class DisjointSet {
    constructor(size) {
        // Initialize parent array: each node is its own parent initially
        this.parent = Array(size).fill().map((_, i) => i);
        // Rank array to keep trees balanced
        this.rank = Array(size).fill(0);
    }

    /**
     * Find operation with path compression
     */
    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    /**
     * Union operation with rank
     */
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);

        if (rootX === rootY) return;

        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }
    }
}

/**
 * Run Kruskal's algorithm to find the minimum spanning tree
 */
function runKruskalsAlgorithm(nodes, edges) {
    // Create a mapping of node IDs to indices
    const nodeMap = {};
    nodes.forEach((node, index) => {
        nodeMap[node.id] = index;
    });

    // Sort edges by weight in ascending order
    const sortedEdges = [...edges].sort((a, b) => parseInt(a.weight) - parseInt(b.weight));

    // Initialize disjoint set
    const ds = new DisjointSet(nodes.length);

    // Initialize MST and total cost
    const minimumSpanningTree = [];
    let totalCost = 0;

    // Process edges in order of increasing weight
    for (const edge of sortedEdges) {
        const sourceIndex = nodeMap[edge.source];
        const targetIndex = nodeMap[edge.target];

        // If including this edge doesn't create a cycle
        if (ds.find(sourceIndex) !== ds.find(targetIndex)) {
            // Add edge to MST
            minimumSpanningTree.push({ ...edge });

            // Add to total cost
            totalCost += parseInt(edge.weight);

            // Union the sets
            ds.union(sourceIndex, targetIndex);
        }
    }

    return { minimumSpanningTree, totalCost };
}