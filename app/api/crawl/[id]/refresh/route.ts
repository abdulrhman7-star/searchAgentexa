import { getCrawlById } from '../../../../../lib/crawler/index-db';
import { CrawlRunner } from '../../../../../lib/crawler/runner';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const crawl = await getCrawlById(id);
    if (!crawl) {
      return new Response(JSON.stringify({ error: 'Crawl job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Spawn re-crawl with same host & options
    const runner = new CrawlRunner(crawl.host, crawl.options, crawl.id);
    runner.run().catch((err) => console.error('Refresh crawl error:', err));

    return new Response(
      JSON.stringify({
        success: true,
        crawlId: runner.crawlId,
        message: 'Re-crawl started in background',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
