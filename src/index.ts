import { useMemo, useRef, useState } from "react";

type EntityId = string;

export type Entity<T = any> = {
  // id: EntityId;
  [key: string]: any; // Allows for any other properties (name, status, etc.)
} & T;
// A Map for better performance/type safety, or a plain object
export type OptimisticUpdateQueue = Record<
  string, // The unique ID of the entity (e.g., 'task-101')
  OptimisticUpdate[] // An array representing the history of updates
>;

export interface OptimisticUpdate {
  // A unique identifier for this specific, atomic change (optional, but helpful)
  versionId: string;
  // The partial data applied in this optimistic step
  patch: Partial<Entity>;
  // A reference to the API request that triggered this (e.g., a promise resolver)
  requestId: string;
}

export default function useOptimisticUpdatesLayer<T>() {
  const [optimistic_state, setOptimisticState] = useState<
    OptimisticUpdateQueue
  >({});
  const optimistic_state_ref = useRef<OptimisticUpdateQueue>({});
  const [rand, setRand] = useState(crypto.randomUUID());

  function syncQueue(nextState: OptimisticUpdateQueue) {
    optimistic_state_ref.current = nextState;
    setOptimisticState(nextState);
    setRand(crypto.randomUUID());
  }

  const optimistic_state_dict = useMemo(() => {
    const out = {} as Record<string, Entity<T>>;
    Object.keys(optimistic_state_ref.current).map((key) => {
      const latest_update = getOptimisticState(key);
      out[key] = latest_update;
    });
    return out;
  }, [rand]);

  function applyOptimisticUpdate(
    patched_obj: Partial<Entity<T>> & { id: EntityId },
  ) {
    const entityId = patched_obj?.id;
    const requestId = crypto.randomUUID();

    const newUpdate: OptimisticUpdate = {
      versionId: crypto.randomUUID(), // Unique ID for this specific patch
      patch: { ...patched_obj },
      requestId,
    };

    const queue = [...(optimistic_state_ref.current[entityId] || [])];
    queue.push(newUpdate);
    syncQueue({
      ...optimistic_state_ref.current,
      [entityId]: queue,
    });

    return requestId;
  }

  // Example: User changes name, then status
  /* applyOptimisticUpdate('task-101', { name: 'New Task Name' }, 'req-A'); */
  /* applyOptimisticUpdate('task-101', { status: 'COMPLETE' }, 'req-B'); */

  function getOptimisticState(id: EntityId): Entity<T> {
    const patches = optimistic_state_ref.current[id] || [];

    // Use Array.prototype.reduce to merge all patches onto the base state
    const finalState = (patches || []).reduce(
      (currentState, update) => ({ ...currentState, ...update.patch }),
      {} as Entity<T>,
    );

    return finalState;
  }
  // Result: baseEntity + patchA + patchB = Final Optimistic State

  function rollbackUpdate(entityId: EntityId, requestId: string) {
    const queue = optimistic_state_ref.current[entityId];
    if (queue) {
      const newQueue = queue.filter((update) => update.requestId !== requestId);
      const nextState = { ...optimistic_state_ref.current };

      if (newQueue.length === 0) {
        delete nextState[entityId];
      } else {
        nextState[entityId] = newQueue;
      }

      syncQueue(nextState);
    }
  }

  function clearUpdates(entityId?: EntityId) {
    if (!entityId) {
      syncQueue({});
      return;
    }

    const nextState = { ...optimistic_state_ref.current };
    delete nextState[entityId];
    syncQueue(nextState);
  }

  // Example: req-A fails
  /* rollbackUpdate('task-101', 'req-A'); */
  // Now, only patch from req-B remains, and the state will be recalculated

  return {
    optimistic_state: optimistic_state,
    applyUpdate: applyOptimisticUpdate,
    optimistic_state_dict,
    optimistic_state_ref,
    getOptimisticState,
    rollbackUpdate,
    clearUpdates,
  };
}
