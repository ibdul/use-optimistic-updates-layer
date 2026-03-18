# use-optimistic-updates

A small React hook for layering optimistic updates on top of entity state.

It keeps a per-entity queue of optimistic patches, lets you compute the merged optimistic view for any entity, and supports rolling back a specific request when a mutation fails.

## Install

```bash
npm install use-optimistic-updates
```

Peer dependencies:

- `react >= 16.8`

## Usage

```tsx
import useOptimisticUpdatesLayer from "use-optimistic-updates";

type Task = {
  id: string;
  title: string;
  status: "todo" | "done";
};

function TasksList() {
  const {
    applyUpdate,
    getOptimisticState,
    optimistic_state_dict,
    rollbackUpdate,
    clearUpdates,
  } = useOptimisticUpdatesLayer<Task>();

  async function updateTaskTitle(taskId: string, title: string) {
    const requestId = applyUpdate({
      id: taskId,
      title,
    });

    try {
      await saveTask({ id: taskId, title });
    } catch (error) {
      rollbackUpdate(taskId, requestId);
    }
  }

  function resetTask(taskId: string) {
    clearUpdates(taskId);
  }

  const task = getOptimisticState("task-1");

  return (
    <div>
      <pre>{JSON.stringify(task, null, 2)}</pre>
      <pre>{JSON.stringify(optimistic_state_dict, null, 2)}</pre>
    </div>
  );
}

async function saveTask(task: { id: string; title: string }) {
  return task;
}
```

## API

### `useOptimisticUpdatesLayer<T>()`

Returns:

- `applyUpdate(patch)`
  Adds a new optimistic patch for an entity and returns a `requestId`.
  The patch must include an `id`.

- `getOptimisticState(entityId)`
  Merges all optimistic patches for an entity and returns the derived optimistic object.

- `rollbackUpdate(entityId, requestId)`
  Removes the optimistic patch associated with that request and recalculates the entity state.

- `clearUpdates(entityId?)`
  Clears optimistic patches for one entity, or all entities when called without an `entityId`.

- `optimistic_state`
  The raw queue store keyed by entity id.

- `optimistic_state_dict`
  A derived dictionary of merged optimistic entities keyed by entity id.

- `optimistic_state_ref`
  A ref pointing at the latest queue state.

## How It Works

Each call to `applyUpdate` creates a request-scoped optimistic patch and appends it to that entity's queue.

`getOptimisticState` and `optimistic_state_dict` reduce the queue into a single merged object, with later patches overriding earlier fields.

If a request fails, `rollbackUpdate` removes only that request's patch and keeps any later optimistic changes intact.

## Development

```bash
npm run build
npm test
```
