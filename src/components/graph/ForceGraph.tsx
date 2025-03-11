import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "../../styles/components/Graph/forceGraph.scss";
import { NodeDatum, LinkDatum } from "../../types/graphTypes";
import { createForceSimulation } from "../../utils/forceSimulation";

interface ForceGraphProps {
    nodes: NodeDatum[];
    links: LinkDatum[];
}

const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, links }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedNode, setSelectedNode] = useState<NodeDatum | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = window.innerWidth;
        const height = window.innerHeight;

        svg.attr("width", width).attr("height", height);

        // Create zoomable <g> group
        const zoomGroup = svg.append("g");

        svg.call(
            d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.5, 3])
                .filter((event) => {
                    // Ignore click events inside nodes
                    return event.type !== "dblclick" && event.target.tagName !== "circle";
                })
                .on("zoom", (event) => {
                    zoomGroup.attr("transform", event.transform);
                    zoomGroup.selectAll(".node-label")
                        .style("opacity", event.transform.k > 1 ? 1 : 0);
                })
        );

        // Create force simulation
        const simulation = createForceSimulation(nodes, links, width, height);

        // Add links
        const linkSelection = zoomGroup.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#ccc")
            .attr("stroke-opacity", 0.7)
            .attr("stroke-width", 1.5);

        // Create node groups
        const nodeGroup = zoomGroup.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g")
            .call(
                d3.drag<SVGGElement, NodeDatum>()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        if (!selectedNode || selectedNode !== d) {
                            if (!selectedNode) {
                                d.fx = null;
                                d.fy = null;
                            }
                        }
                    })

            );

        // Add circle nodes
        nodeGroup.append("circle")
            .attr("r", 16)
            .attr("fill", "#0066cc")
            .attr("stroke", "#003366")
            .attr("stroke-width", 2)
            .attr("class", "node");

        // Add labels inside nodes
        nodeGroup.append("text")
            .attr("class", "node-label")
            .attr("dy", 5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "white")
            .style("pointer-events", "none")
            .style("font-weight", "bold")
            .text((d) => d.name.split(" ")[0]);

        const updateHighlight = (selectedNode: NodeDatum | null) => {
            const connectedNodes = new Set();
            const connectedLinks = new Set();

            if (selectedNode) {
                links.forEach((link) => {
                    if (link.source === selectedNode || link.target === selectedNode) {
                        connectedNodes.add(link.source);
                        connectedNodes.add(link.target);
                        connectedLinks.add(link);
                    }
                });
            }

            // Reduce opacity for all nodes and links
            nodeGroup.selectAll("circle").attr("fill", selectedNode ? "#aaa" : "#0066cc");
            linkSelection.attr("stroke-opacity", selectedNode ? 0.1 : 0.7);

            if (selectedNode) {
                // Highlight connected nodes and links
                nodeGroup
                    .filter((n) => connectedNodes.has(n))
                    .selectAll("circle")
                    .attr("fill", "#ffcc00");

                linkSelection
                    .filter((l) => connectedLinks.has(l))
                    .attr("stroke", "#ff9900")
                    .attr("stroke-opacity", 1)
                    .attr("stroke-width", 3);
            }
        };

        nodeGroup.on("click", function (_, d) {
            setSelectedNode((prev) => {
                if (prev === d) {
                    d.fx = d.x;
                    d.fy = d.y;
                    return null;
                } else {
                    d.fx = d.x;
                    d.fy = d.y;
                    return d;
                }
            });
        });


        // Mouse over event
        nodeGroup.on("mouseover", function (_, d) {
            if (!selectedNode) updateHighlight(d);
        });

        // Mouse out event (only if no node is selected)
        nodeGroup.on("mouseout", function () {
            if (!selectedNode) updateHighlight(null);
        });

        // Update highlights when selectedNode changes
        updateHighlight(selectedNode);

        // Simulation tick updates
        simulation.on("tick", () => {
            linkSelection
                .attr("x1", (d) => (d.source as NodeDatum).x!)
                .attr("y1", (d) => (d.source as NodeDatum).y!)
                .attr("x2", (d) => (d.target as NodeDatum).x!)
                .attr("y2", (d) => (d.target as NodeDatum).y!);

            nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
        });

        // Resize handling
        const handleResize = () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            svg.attr("width", newWidth).attr("height", newHeight);
            simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2)).alpha(1).restart();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            simulation.stop();
            window.removeEventListener("resize", handleResize);
        };
    }, [nodes, links, selectedNode]); // Depend on selectedNode

    return (
        <svg ref={svgRef} className="force-graph-container" />
    );
};

export default ForceGraph;
