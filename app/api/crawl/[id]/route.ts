import { getCrawlById } from '../../../../lib/crawler/index-db';
import { cancelCrawl, getActiveCrawl } from '../../../../lib/crawler/runner';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const active = getActiveCrawl(id);
    if (active) {
      return new Response(JSON.stringify(active.job), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const crawl = await getCrawlById(id);
    if (!crawl) {
      return new Response(JSON.stringify({ error: 'Crawl job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(crawl), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const cancelled = cancelCrawl(id);
    return new Response(JSON.stringify({ success: true, cancelled }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
