import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { AlgorithmStep, ProblemData, SolutionDefinition } from '../../types';
import {
  deriveMetrics,
  operationLabel,
  prefersReducedMotion,
  resolveLegend
} from '../../features/animation/motion';
import { renderFrame } from '../../features/animation/render/renderFrame';

type Props = {
  data: ProblemData | null;
  step: AlgorithmStep;
  solution: SolutionDefinition;
  speed?: number;
};

const WIDTH = 1200;
const HEIGHT = 720;

const MARKERS = [
  { id: 'flow-arrow', color: '#2f9e7d' },
  { id: 'transfer-arrow', color: '#b07a12' },
  { id: 'return-arrow', color: '#18765a' },
  { id: 'pointer-arrow', color: '#6b7f79' }
] as const;

export function VisualizationCanvas({ data, step, solution, speed = 1 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomLayerRef = useRef<SVGGElement | null>(null);

  const summary = useMemo(
    () => `${solution.name} - Step ${step.id + 1}: ${step.title}`,
    [solution.name, step.id, step.title]
  );
  const legend = useMemo(() => resolveLegend(step.frame), [step.frame]);
  const metrics = useMemo(() => deriveMetrics(step.frame), [step.frame]);
  const operation = operationLabel(step.operation);
  const narration = step.narration ?? step.description;

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

    renderFrame(
      d3.select(zoomLayerRef.current),
      step.frame,
      speed,
      prefersReducedMotion()
    );
  }, [step, speed]);

  return (
    <div
      className="canvas-card"
      data-testid="visualization-canvas"
      data-step-id={step.id}
      data-operation={step.operation ?? ''}
    >
      <div className="canvas-title" data-testid="canvas-title">
        <span className="canvas-title-text">{summary}</span>
        {step.operation ? (
          <span className="operation-badge" data-testid="operation-badge" data-operation={step.operation}>
            {operation}
          </span>
        ) : null}
      </div>

      <svg ref={svgRef} data-testid="canvas-svg" className="viz-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          {MARKERS.map((marker) => (
            <marker
              key={marker.id}
              id={marker.id}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill={marker.color} />
            </marker>
          ))}
        </defs>
        <g ref={zoomLayerRef}>
          <rect className="canvas-backdrop" x="0" y="0" width={WIDTH} height={HEIGHT} />
          <g className="layer-containers" />
          <g className="layer-edges" />
          <g className="layer-arrows" />
          <g className="layer-nodes" />
          <g className="layer-labels" />
        </g>
      </svg>

      <div className="canvas-caption">
        <p className="caption-text" data-testid="step-narration">
          {narration}
        </p>
        <div className="canvas-notes" data-testid="canvas-notes">
          {step.frame.notes.map((note, index) => (
            <span key={`${index}-${note}`} className="note-item">
              {note}
            </span>
          ))}
        </div>
      </div>

      <div className="canvas-meta-row">
        <div className="canvas-legend" data-testid="canvas-legend">
          <span className="legend-title">图例</span>
          {legend.map((item) => (
            <span key={item.status} className="legend-chip" data-testid={`legend-item-${item.status}`}>
              <i className={`legend-dot state-${item.status}`} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
        <div className="canvas-metrics" data-testid="canvas-metrics">
          {metrics.map((metric) => (
            <span key={metric.label} className="metric-chip">
              <b>{metric.value}</b>
              {metric.label}
            </span>
          ))}
        </div>
      </div>

      {data ? (
        <div className="canvas-input-echo" data-testid="canvas-input-echo">
          当前输入: {data.raw}
        </div>
      ) : null}
    </div>
  );
}
