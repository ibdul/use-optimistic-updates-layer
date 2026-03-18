// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import useOptimisticUpdatesLayer from "./index";

afterEach(() => {
  cleanup();
});

function setupHook() {
  type Task = {
    id: string;
    title?: string;
    status?: string;
    priority?: number;
  };

  let hook: ReturnType<typeof useOptimisticUpdatesLayer<Task>> | undefined;

  function Harness() {
    hook = useOptimisticUpdatesLayer<Task>();
    return null;
  }

  render(<Harness />);

  return function getHook() {
    if (!hook) {
      throw new Error("Hook failed to initialize");
    }

    return hook;
  };
}

describe("useOptimisticUpdatesLayer", () => {
  it("applies updates and merges optimistic state for the same entity", () => {
    const getHook = setupHook();

    let firstRequestId = "";
    let secondRequestId = "";

    act(() => {
      firstRequestId = getHook().applyUpdate({
        id: "task-1",
        title: "Draft copy",
      });

      secondRequestId = getHook().applyUpdate({
        id: "task-1",
        status: "done",
        priority: 1,
      });
    });

    expect(firstRequestId).toBeTruthy();
    expect(secondRequestId).toBeTruthy();
    expect(firstRequestId).not.toBe(secondRequestId);

    expect(getHook().optimistic_state["task-1"]).toHaveLength(2);
    expect(getHook().getOptimisticState("task-1")).toEqual({
      id: "task-1",
      title: "Draft copy",
      status: "done",
      priority: 1,
    });
    expect(getHook().optimistic_state_dict["task-1"]).toEqual({
      id: "task-1",
      title: "Draft copy",
      status: "done",
      priority: 1,
    });
  });

  it("rolls back a specific optimistic request while keeping later updates", () => {
    const getHook = setupHook();

    let firstRequestId = "";

    act(() => {
      firstRequestId = getHook().applyUpdate({
        id: "task-1",
        title: "Draft copy",
      });

      getHook().applyUpdate({
        id: "task-1",
        status: "done",
        priority: 1,
      });
    });

    act(() => {
      getHook().rollbackUpdate("task-1", firstRequestId);
    });

    expect(getHook().optimistic_state["task-1"]).toHaveLength(1);
    expect(getHook().getOptimisticState("task-1")).toEqual({
      id: "task-1",
      status: "done",
      priority: 1,
    });
  });

  it("clears updates for a single entity", () => {
    const getHook = setupHook();

    act(() => {
      getHook().applyUpdate({
        id: "task-1",
        title: "Draft copy",
      });
    });

    act(() => {
      getHook().clearUpdates("task-1");
    });

    expect(getHook().optimistic_state["task-1"]).toBeUndefined();
    expect(getHook().optimistic_state_dict["task-1"]).toBeUndefined();
    expect(getHook().optimistic_state_ref.current["task-1"]).toBeUndefined();
  });

  it("clears all optimistic updates when called without an entity id", () => {
    const getHook = setupHook();

    act(() => {
      getHook().applyUpdate({
        id: "task-1",
        title: "Draft copy",
      });
      getHook().applyUpdate({
        id: "task-2",
        title: "Needs review",
      });
      getHook().clearUpdates();
    });

    expect(getHook().optimistic_state).toEqual({});
    expect(getHook().optimistic_state_ref.current).toEqual({});
    expect(getHook().optimistic_state_dict).toEqual({});
  });
});
