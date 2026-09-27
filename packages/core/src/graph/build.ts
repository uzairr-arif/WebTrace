/**
 * Flow graph builder — turns correlated records into the node/edge graph the
 * Live Flow view renders.
 *
 * Honest-parent doctrine: webRequest alone cannot attribute a fetch() to the
 * exact script that issued it (that needs CDP). So:
 *   - redirect and preflight links are OBSERVED;
 *   - document → subresource links are OBSERVED when the browser provided a
 *     documentId, DERIVED otherwise;
 *   - document → Fetch/XHR links are labeled "JavaScript" and marked DERIVED.
 */

import type { NavigationRecord, RequestRecord } from '../models/types';
import type { FlowEdge, FlowGraph, FlowNode, FlowRelation } from '../models/types';
import type { TraceEventSource } from '../events/types';
import { pathOf, shortUrl } from '../models/hosts';

const MAX_NODES = 250;
const COL_WIDTH = 250;
const ROW_HEIGHT = 78;
const PADDING = 24;

interface ParentLink {
  id: string;
  relation: FlowRelation;
  evidence: TraceEventSource;
  label?: string;
}

export function buildFlowGraph(
  navigations: NavigationRecord[],
  requests: RequestRecord[],
): FlowGraph {
  const totalRequests = requests.length;
  const truncated = totalRequests > MAX_NODES;
  // Top-frame documents are represented by their navigation node — no
  // duplicate. (Sub-frame documents remain as regular nodes.)
  const drawable = requests.filter(
    (r) => !(r.category === 'document' && (r.frameId ?? 0) === 0),
  );
  const visible = truncated ? drawable.slice(-MAX_NODES) : drawable;

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const topNavigations = navigations.filter((n) => n.frameId === 0 && n.url !== '');
  const navNodeIds = new Set<string>();
  for (const nav of topNavigations) navNodeIds.add(`nav:${nav.id}`);

  const recordById = new Map(requests.map((r) => [r.id, r]));
  const visibleIds = new Set(visible.map((r) => `req:${r.id}`));
  const parentOf = new Map<string, ParentLink>();

  for (const r of visible) {
    const nodeId = `req:${r.id}`;

    if (r.redirectOfId && visibleIds.has(`req:${r.redirectOfId}`)) {
      const prev = recordById.get(r.redirectOfId);
      parentOf.set(nodeId, {
        id: `req:${r.redirectOfId}`,
        relation: 'redirect',
        evidence: 'observed',
        label: prev?.status !== undefined ? `${prev.status} →` : 'redirect →',
      });
      continue;
    }

    if (r.preflightOfId && visibleIds.has(`req:${r.preflightOfId}`)) {
      parentOf.set(nodeId, {
        id: `req:${r.preflightOfId}`,
        relation: 'preflight-for',
        evidence: 'observed',
        label: 'preflight',
      });
      continue;
    }

    const nav = pickNavigation(navigations, r);
    if (nav && navNodeIds.has(`nav:${nav.id}`)) {
      const apiLike = r.category === 'xhr';
      // The documentId match proves the request belongs to this document,
      // but "JavaScript initiated it" remains an inference either way.
      parentOf.set(nodeId, {
        id: `nav:${nav.id}`,
        relation: apiLike ? 'initiated-by-script' : 'resource-of',
        evidence: apiLike ? 'derived' : r.navigationId === nav.id ? 'observed' : 'derived',
        label: apiLike ? 'JavaScript' : undefined,
      });
      continue;
    }

    // No navigation context — the request hangs in space; give it depth 0.
    parentOf.set(nodeId, {
      id: '__root__',
      relation: 'resource-of',
      evidence: 'derived',
    });
  }

  /* -------------------------------- layout -------------------------------- */

  const depth = new Map<string, number>();
  for (const id of navNodeIds) depth.set(id, 0);
  depth.set('__root__', 0);

  // Requests arrive sorted by startedAt; redirect/preflight parents always
  // started earlier, so a single pass assigns depths correctly.
  for (const r of visible) {
    const nodeId = `req:${r.id}`;
    const link = parentOf.get(nodeId);
    const parentDepth = link ? (depth.get(link.id) ?? 0) : 0;
    depth.set(nodeId, parentDepth + 1);
  }

  const byDepth = new Map<number, FlowNode[]>();
  const place = (id: string, data: FlowNode['data'], d: number, order: number) => {
    const node: FlowNode = {
      id,
      x: PADDING + d * COL_WIDTH,
      y: 0,
      data,
    };
    const bucket = byDepth.get(d) ?? [];
    bucket.push(node);
    byDepth.set(d, bucket);
    nodes.push(node);
  };

  for (const nav of topNavigations) {
    place(
      `nav:${nav.id}`,
      {
        kind: 'navigation',
        label: shortUrl(nav.url, 42),
        sublabel: 'Page navigation',
        url: nav.url,
        category: 'navigation',
        navigationId: nav.id,
        source: 'observed',
      },
      0,
      0,
    );
  }

  for (const r of visible) {
    place(
      `req:${r.id}`,
      {
        kind: 'request',
        label: r.hopIndex > 0 ? `↳ ${r.path}` : r.path,
        sublabel: r.thirdParty ? r.host : undefined,
        url: r.url,
        category: r.category,
        status: r.status,
        isError: r.error !== undefined || (r.status !== undefined && r.status >= 400),
        durationMs: r.durationMs,
        thirdParty: r.thirdParty,
        requestId: r.id,
        source: 'observed',
      },
      depth.get(`req:${r.id}`) ?? 1,
      0,
    );
  }

  // Vertical ordering within each depth column: by time of appearance.
  let maxDepth = 0;
  for (const d of byDepth.keys()) maxDepth = Math.max(maxDepth, d);
  for (let d = 0; d <= maxDepth; d++) {
    const bucket = byDepth.get(d) ?? [];
    bucket.forEach((node, i) => {
      node.y = PADDING + i * ROW_HEIGHT;
    });
  }

  /* --------------------------------- edges --------------------------------- */

  for (const [target, link] of parentOf) {
    if (link.id === '__root__') continue;
    edges.push({
      id: `e:${link.id}->${target}`,
      source: link.id,
      target,
      relation: link.relation,
      evidence: link.evidence,
      label: link.label,
    });
  }

  return { nodes, edges, truncated, totalRequests };
}

function pickNavigation(
  navigations: NavigationRecord[],
  record: RequestRecord,
): NavigationRecord | undefined {
  if (record.navigationId) {
    const exact = navigations.find((n) => n.id === record.navigationId);
    if (exact) return exact;
  }
  if (record.documentId) {
    const byDoc = navigations.find((n) => n.id === record.documentId);
    if (byDoc) return byDoc;
  }
  const startedAt = record.startedAt ?? Number.MAX_SAFE_INTEGER;
  const candidates = navigations.filter(
    (n) => n.frameId === 0 && !n.isHistory && (n.committedAt ?? 0) <= startedAt,
  );
  return candidates[candidates.length - 1];
}

/** Path helper shared with the UI (kept here so labels stay consistent). */
export function requestLabel(url: string): string {
  return pathOf(url);
}
