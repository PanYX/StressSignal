export function GET() {
  const adsensePublisherId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID?.trim();
  const body = adsensePublisherId
    ? `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Configure GOOGLE_ADSENSE_PUBLISHER_ID to publish Google AdSense ads.txt.\n";

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=3600",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
