import {
  scheduledHandler,
  type ExecutionContextLike,
  type ScheduledControllerLike,
} from "./scheduled";
import type { WorkerBindings } from "./bindings";

/**
 * OpenNext owns the HTTP application. Its generated Worker is produced by the
 * OpenNext build and remains the single request handler. This module attaches
 * the project's scheduled-event seam without creating a second HTTP server.
 */
import openNextWorker from "../.open-next/worker.js";

interface OpenNextHandler {
  fetch(
    request: Request,
    env: WorkerBindings,
    ctx: WorkerExecutionContext,
  ): Promise<Response> | Response;
}

export interface WorkerExecutionContext extends ExecutionContextLike {}

const application = openNextWorker as OpenNextHandler;

export default {
  fetch(
    request: Request,
    env: WorkerBindings,
    ctx: WorkerExecutionContext,
  ): Promise<Response> | Response {
    return application.fetch(request, env, ctx);
  },

  scheduled(
    controller: ScheduledControllerLike,
    env: WorkerBindings,
    ctx: WorkerExecutionContext,
  ): Promise<void> {
    return scheduledHandler(controller, env, ctx);
  },
};
