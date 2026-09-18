import { startOrGetCrawl, getActiveCrawl } from '../../../../lib/crawler/runner';
import { getCrawlById } from '../../../../lib/crawler/index-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { site, pathPrefix, options } = body;

    if (!site || typeof site !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid site domain is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mergedOptions = {
      ...(options || {}),
      ...(pathPrefix ? { pathPrefix } : {}),
    };

    const { crawlId, cached, runner } = await startOrGetCrawl(site, mergedOptions);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'meta',
              crawlId,
              cached,
              site,
            })}\n\n`
          )
        );

        if (cached) {
          const existing = await getCrawlById(crawlId);
          if (existing) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'done',
                  data: { stats: existing.stats, reason: 'cached_index' },
                  crawlId,
                  cached: true,
                })}\n\n`
              )
            );
          }
          controller.close();
          return;
        }

        if (runner) {
          const cleanup = runner.on((event) => {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ ...event, crawlId, cached: false })}\n\n`
                )
              );
              if (event.type === 'done' || event.type === 'error') {
                cleanup();
                controller.close();
              }
            } catch {
              cleanup();
            }
          });
        } else {
          // Already running by another request
          const active = getActiveCrawl(crawlId);
          if (active) {
            const cleanup = () => {
              active.listeners.delete(listener);
            };
            const listener = (event: any) => {
              try {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ ...event, crawlId, cached: false })}\n\n`
                  )
                );
                if (event.type === 'done' || event.type === 'error') {
                  cleanup();
                  controller.close();
                }
              } catch {
                cleanup();
              }
            };
            active.listeners.add(listener);
          } else {
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to start crawl' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
