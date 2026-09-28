import type { APIRoute } from "astro";
import type { Message } from "../../lib/db";
import { bus } from "../../lib/events";

// The minimal server-sent-events (SSE) pattern: a long-lived streaming
// response the browser consumes with `new EventSource("/api/events")`.
// SSE is one-directional (server → browser) and plain HTTP, which makes it
// the simplest live channel that works everywhere — reach for WebSockets
// only when the client needs to push over the same connection.
export const GET: APIRoute = () => {
  let onMessage: (message: Message) => void;
  let onPlan: (studentId: string) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onMessage = (message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      };
      bus.on("message", onMessage);
      // A plan changed (another tab enrolled or dropped): pages showing that
      // student's plan reload it.
      onPlan = (studentId) => {
        controller.enqueue(`event: plan-changed\ndata: ${JSON.stringify(studentId)}\n\n`);
      };
      bus.on("plan-changed", onPlan);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("message", onMessage);
      bus.off("plan-changed", onPlan);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
