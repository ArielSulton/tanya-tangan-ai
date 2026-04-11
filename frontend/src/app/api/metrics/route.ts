/**
 * Simple metrics endpoint to prevent 404 errors
 * Returns basic application metrics in Prometheus format
 */

import { NextResponse } from 'next/server'

export function GET() {
  try {
    // Basic metrics in Prometheus format
    const metrics = `
# HELP pensyarat_frontend_uptime_seconds Frontend uptime in seconds
# TYPE pensyarat_frontend_uptime_seconds counter
pensyarat_frontend_uptime_seconds ${Math.floor(process.uptime())}

# HELP pensyarat_frontend_memory_usage_bytes Memory usage in bytes
# TYPE pensyarat_frontend_memory_usage_bytes gauge
pensyarat_frontend_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP pensyarat_frontend_requests_total Total number of requests
# TYPE pensyarat_frontend_requests_total counter
pensyarat_frontend_requests_total 1
`.trim()

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating metrics:', error)
    return NextResponse.json({ error: 'Failed to generate metrics' }, { status: 500 })
  }
}
