import { getServiceSupabase } from "@/app/lib/supabase/admin";
import {
  ApiError,
  handleApiError,
  requireStaff,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

const realtimeTables = ["orders", "notifications", "tables"] as const;

type ChangePayload = {
  eventType?: string;
  commit_timestamp?: string;
};

export async function GET(request: Request) {
  try {
    const { staff } = await requireStaff(request);
    const realtime = getServiceSupabase();
    if (!realtime) {
      throw new ApiError(503, "realtime_unconfigured", "Realtime services are not configured.");
    }

    const encoder = new TextEncoder();
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let cleanup: (() => Promise<void>) | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: Record<string, unknown>) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            void cleanup?.();
          }
        };

        let channel = realtime.channel(
          `operations:${staff.branchId}:${crypto.randomUUID()}`,
          { config: { private: true } },
        );
        for (const table of realtimeTables) {
          channel = channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              filter: `branch_id=eq.${staff.branchId}`,
            },
            (rawPayload) => {
              const payload = rawPayload as ChangePayload;
              send("invalidation", {
                table,
                eventType: payload.eventType ?? "UPDATE",
                commitTimestamp: payload.commit_timestamp ?? new Date().toISOString(),
              });
            },
          );
        }

        cleanup = async () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          request.signal.removeEventListener("abort", abort);
          await realtime.removeChannel(channel);
          try {
            controller.close();
          } catch {
            // The client may already have closed the stream.
          }
        };
        const abort = () => {
          void cleanup?.();
        };
        request.signal.addEventListener("abort", abort, { once: true });

        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            send("connected", {
              branchId: staff.branchId,
              subscribedAt: new Date().toISOString(),
            });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            send("stream_error", { retryable: true });
            void cleanup?.();
          }
        });

        heartbeat = setInterval(() => {
          send("keepalive", { at: new Date().toISOString() });
        }, 15_000);
      },
      cancel() {
        return cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        "cache-control": "no-cache, no-transform",
        "content-type": "text/event-stream; charset=utf-8",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (problem) {
    return handleApiError(problem);
  }
}
