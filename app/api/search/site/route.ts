import { executeSiteSearch } from '../../../../lib/crawler/search';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { crawlId, query = '', tabs = ['pages', 'files'], limit = 30 } = body;

    if (!crawlId) {
      return new Response(JSON.stringify({ error: 'crawlId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchResponse = await executeSiteSearch({
      crawlId,
      query,
      tabs,
      limit,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Stream meta
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'meta',
              host: searchResponse.host,
              crawlId: searchResponse.crawlId,
            })}\n\n`
          )
        );

        // Stream pages batch if any
        if (searchResponse.pages.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'batch',
                tab: 'pages',
                results: searchResponse.pages,
              })}\n\n`
            )
          );
        }

        // Stream files batch if any
        if (searchResponse.files.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'batch',
                tab: 'files',
                results: searchResponse.files,
              })}\n\n`
            )
          );
        }

        // Stream done
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              elapsedMs: searchResponse.elapsedMs,
              total: searchResponse.total,
            })}\n\n`
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Site search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
