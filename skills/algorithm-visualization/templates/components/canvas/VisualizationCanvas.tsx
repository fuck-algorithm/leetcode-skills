import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { AlgorithmStep, ProblemData, SolutionDefinition } from '../../types';

type Props = {
  data: ProblemData | null;
  step: AlgorithmStep;
  solution: SolutionDefinition;
};

const WIDTH = 1200;
const HEIGHT = 720;

export function VisualizationCanvas({ data, step, solution }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomLayerRef = useRef<SVGGElement | null>(null);

  const summary = useMemo(
    () => `${solution.name} - Step ${step.id + 1}: ${step.title}`,
    [solution.name, step.id, step.title]
  );

  useEffect(() => {
    if (!svgRef.current || !zoomLayerRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);
    const zoomLayer = d3.select(zoomLayerRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.4, 2.5]).on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform.toString());
    });

    svg.call(zoom as never);
    svg.call(zoom.transform as never, d3.zoomIdentity.translate(80, 40).scale(1));
  }, []);

  useEffect(() => {
    if (!zoomLayerRef.current) {
      return;
    }

    const layer = d3.select(zoomLayerRef.current);
    layer.selectAll('*').remove();

    const nodeById = new Map(step.frame.nodes.map((node) => [node.id, node]));

    layer
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('fill', 'rgba(255,255,255,0.02)');

    for (const edge of step.frame.edges) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      layer
        .append('line')
        .attr('x1', from.x)
        .attr('y1', from.y)
        .attr('x2', to.x)
        .attr('y2', to.y)
        .attr('stroke', '#8fb3ad')
        .attr('stroke-width', 2);

      if (edge.label) {
        layer
          .append('text')
          .attr('x', (from.x + to.x) / 2)
          .attr('y', (from.y + to.y) / 2 - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#5a6e69')
          .attr('font-size', 12)
          .text(edge.label);
      }
    }

    for (const node of step.frame.nodes) {
      const isNull = node.kind === 'null';
      layer
        .append('circle')
        .attr('cx', node.x)
        .attr('cy', node.y)
        .attr('r', 24)
        .attr('fill', isNull ? 'transparent' : node.kind === 'highlight' ? '#2f9e7d' : '#dde9e6')
        .attr('stroke', isNull ? '#8f8f8f' : '#31554d')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isNull ? '4 4' : null);

      layer
        .append('text')
        .attr('x', node.x)
        .attr('y', node.y + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', isNull ? '#7b7b7b' : '#0f1f1b')
        .attr('font-size', 12)
        .text(node.label);
    }

    for (const arrow of step.frame.arrows) {
      layer
        .append('line')
        .attr('x1', arrow.from.x)
        .attr('y1', arrow.from.y)
        .attr('x2', arrow.to.x)
        .attr('y2', arrow.to.y)
        .attr('stroke', '#2f9e7d')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#flow-arrow)');

      if (arrow.text) {
        layer
          .append('text')
          .attr('x', (arrow.from.x + arrow.to.x) / 2)
          .attr('y', (arrow.from.y + arrow.to.y) / 2 - 10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#2f9e7d')
          .attr('font-size', 11)
          .text(arrow.text);
      }
    }

    for (const label of step.frame.labels) {
      const target = nodeById.get(label.targetId);
      if (!target) {
        continue;
      }
      const dx = label.position === 'left' ? -40 : label.position === 'right' ? 40 : 0;
      const dy = label.position === 'top' ? -34 : label.position === 'bottom' ? 34 : 0;
      layer
        .append('text')
        .attr('x', target.x + dx)
        .attr('y', target.y + dy)
        .attr('text-anchor', 'middle')
        .attr('fill', '#40524d')
        .attr('font-size', 11)
        .text(label.text);
    }
  }, [step]);

  return (
    <div className="canvas-card" data-testid="visualization-canvas">
      <div className="canvas-title" data-testid="canvas-title">{summary}</div>
      <svg ref={svgRef} data-testid="canvas-svg" className="viz-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <marker
            id="flow-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="#2f9e7d" />
          </marker>
        </defs>
        <g ref={zoomLayerRef} />
      </svg>
      <div className="canvas-notes" data-testid="canvas-notes">
        {step.frame.notes.map((note, idx) => (
          <span key={idx} className="note-item">
            {note}
          </span>
        ))}
      </div>
      {data ? <div className="canvas-input-echo" data-testid="canvas-input-echo">当前输入: {data.raw}</div> : null}
    </div>
  );
}
