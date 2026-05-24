import { useState, useEffect } from "react";
import { mockBccRequests } from "../mock/data";
import type { BccRequest, BccStatus } from "../types";

let requests: BccRequest[] = [...mockBccRequests];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export function getBccRequests() {
  return requests;
}

export function updateBccStatus(
  id: string,
  status: BccStatus,
  actorName: string,
  note?: string,
) {
  requests = requests.map(r =>
    r.id !== id ? r : {
      ...r,
      status,
      ...(status === "completed" || status === "in_progress"
        ? { completedBy: actorName, completedAt: new Date().toISOString() }
        : {}),
      ...(note !== undefined ? { notes: note } : {}),
    }
  );
  notify();
}

export function addBccRequest(req: BccRequest) {
  requests = [req, ...requests];
  notify();
}

export function useBccRequests() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick(t => t + 1);
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);
  return requests;
}
