import Graph from "graphology";
import Sigma from "sigma";
import { Coordinates, NodeDisplayData, EdgeDisplayData } from "sigma/types";
// import { NodeAttributes, EdgeAttributes } from "graphology-types";
import { DATA as data } from "./data";
import EdgeCurveProgram, {
    EdgeCurvedArrowProgram,
    EdgeCurvedDoubleArrowProgram,
} from "@sigma/edge-curve";
import {
    EdgeRectangleProgram,
    EdgeArrowProgram,
    EdgeDoubleArrowProgram,
} from "sigma/rendering";

// Retrieve some useful DOM elements:

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sigma-container") as HTMLElement;
    const searchInput = document.getElementById(
        "search-input"
    ) as HTMLInputElement;
    const searchSuggestions = document.getElementById(
        "suggestions"
    ) as HTMLDataListElement;
    const filterSelect = document.getElementById(
        "filter-select"
    ) as HTMLSelectElement;

    // Instantiate sigma:
    const graph = new Graph();

    data.nodes.forEach((node) => {
        graph.addNode(node.key, {
            label: node.attributes.label,
            size: node.attributes.size,
            x: node.attributes.x,
            y: node.attributes.y,
            color: node.attributes.color,
        });
    });

    data.edges.forEach((edge) => {
        graph.addEdge(edge.source, edge.target);
    });

    const renderer = new Sigma(graph, container, {
        allowInvalidContainer: true,
        defaultEdgeType: "straightNoArrow",
        renderEdgeLabels: true,
        edgeProgramClasses: {
            straightNoArrow: EdgeRectangleProgram,
            curvedNoArrow: EdgeCurveProgram,
            straightArrow: EdgeArrowProgram,
            curvedArrow: EdgeCurvedArrowProgram,
            straightDoubleArrow: EdgeDoubleArrowProgram,
            curvedDoubleArrow: EdgeCurvedDoubleArrowProgram,
        },
    });

    // Type and declare internal state:
    interface State {
        hoveredNode?: string;
        searchQuery: string;
        selectedNode?: string;
        suggestions?: Set<string>;
        hoveredNeighbors?: Set<string>;
        filterType: "both" | "in" | "out";
    }

    const state: State = {
        searchQuery: "",
        filterType: "both",
    };

    // Feed the datalist autocomplete values:
    searchSuggestions.innerHTML = graph
        .nodes()
        .map(
            (node) =>
                `<option value="${graph.getNodeAttribute(
                    node,
                    "label"
                )}"></option>`
        )
        .join("\n");

    // Actions:
    function setSearchQuery(query: string) {
        state.searchQuery = query;
        if (searchInput.value !== query) searchInput.value = query;
        if (query) {
            const lcQuery = query.toLowerCase();
            const suggestions = graph
                .nodes()
                .map((n) => ({
                    id: n,
                    label: graph.getNodeAttribute(n, "label") as string,
                }))
                .filter(({ label }) => label.toLowerCase().includes(lcQuery));

            if (suggestions.length === 1 && suggestions[0].label === query) {
                state.selectedNode = suggestions[0].id;
                state.suggestions = undefined;
                const nodePosition = renderer.getNodeDisplayData(
                    state.selectedNode
                ) as Coordinates;
                renderer.getCamera().animate(nodePosition, { duration: 500 });
                applyFilter();
            } else {
                state.selectedNode = undefined;
                state.suggestions = new Set(suggestions.map(({ id }) => id));
                applyFilter();
            }
        } else {
            state.selectedNode = undefined;
            state.suggestions = undefined;
            applyFilter();
        }
    }

    function setHoveredNode(node?: string) {
        console.log(node);
        if (node) {
            state.hoveredNode = node;
            state.hoveredNeighbors = new Set(graph.neighbors(node));
        } else {
            state.hoveredNode = undefined;
            state.hoveredNeighbors = undefined;
        }

        renderer.refresh({ skipIndexation: true });
    }

    function applyFilter() {
        renderer.refresh({ skipIndexation: true });
    }

    // Bind search input interactions:
    searchInput.addEventListener("input", () => {
        setSearchQuery(searchInput.value || "");
    });

    searchInput.addEventListener("blur", () => {
        setSearchQuery("");
    });

    // Bind filter select interactions:
    filterSelect.addEventListener("change", () => {
        state.filterType = filterSelect.value as "both" | "in" | "out";
        applyFilter();
    });

    // Bind graph interactions:
    renderer.on("enterNode", ({ node }) => {
        console.log("enternode");
        setHoveredNode(node);
    });

    renderer.on("leaveNode", () => {
        setHoveredNode(undefined);
    });

    // Render nodes accordingly to the internal state:
    renderer.setSetting("nodeReducer", (node, data) => {
        const res: Partial<NodeDisplayData> = { ...data };

        if (state.selectedNode) {
            const neighbors = new Set(
                graph[
                    state.filterType === "both"
                        ? "neighbors"
                        : state.filterType === "in"
                        ? "inNeighbors"
                        : "outNeighbors"
                ](state.selectedNode)
            );

            if (!neighbors.has(node) && node !== state.selectedNode) {
                res.label = "";
                res.color = "#f6f6f6";
            }
        }

        return res;
    });

    // Render edges accordingly to the internal state:
    // renderer.setSetting("edgeReducer", (edge, data) => {
    //     const res: Partial<EdgeDisplayData> = { ...data };

    //     if (state.selectedNode) {
    //         const [source, target] = graph.extremities(edge);
    //         const isSourceSelected = source === state.selectedNode;
    //         const isTargetSelected = target === state.selectedNode;
    //         const neighbors = new Set(
    //             graph[
    //                 state.filterType === "both"
    //                     ? "neighbors"
    //                     : state.filterType === "in"
    //                     ? "inNeighbors"
    //                     : "outNeighbors"
    //             ](state.selectedNode)
    //         );

    //         if (
    //             (state.filterType === "in" && !isTargetSelected) ||
    //             (state.filterType === "out" && !isSourceSelected) ||
    //             !neighbors.has(source) ||
    //             !neighbors.has(target)
    //         ) {
    //             res.hidden = true;
    //         } else {
    //             res.hidden = false;
    //         }
    //     }

    //     return res;
    // });
    renderer.setSetting("edgeReducer", (edge, data) => {
        const res: Partial<EdgeDisplayData> = { ...data };

        if (state.selectedNode) {
            const [source, target] = graph.extremities(edge);
            const isSourceSelected = source === state.selectedNode;
            const isTargetSelected = target === state.selectedNode;
            const neighbors = new Set(
                graph[
                    state.filterType === "both"
                        ? "neighbors"
                        : state.filterType === "in"
                        ? "inNeighbors"
                        : "outNeighbors"
                ](state.selectedNode)
            );

            if (
                (state.filterType === "in" && !isTargetSelected) ||
                (state.filterType === "out" && !isSourceSelected) ||
                !(neighbors.has(source) || neighbors.has(target))
            ) {
                res.hidden = true;
            } else {
                res.hidden = false;
            }
        }

        return res;
    });
});
