import Link from "next/link"
import { ArrowRight, Camera, Search } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="mx-auto max-w-2xl px-6 py-8 text-center">
        {/* Header */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Real-Time Inventory Dashboard
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Monitor warehouse bin locations and stock levels in real-time
        </p>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Snapshot Card */}
          <Link
            href="/snapshot"
            className="group relative flex flex-col items-center p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="rounded-full bg-primary/10 p-4 mb-4 group-hover:bg-primary/20 transition-colors">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Snapshot</h2>
            <p className="text-sm text-muted-foreground mb-4">
              View current inventory snapshot data
            </p>
            <span className="inline-flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Open Snapshot
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Query Card */}
          <Link
            href="/query"
            className="group relative flex flex-col items-center p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="rounded-full bg-primary/10 p-4 mb-4 group-hover:bg-primary/20 transition-colors">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Query</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Query real-time inventory data
            </p>
            <span className="inline-flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Open Query
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Footer Note */}
        <p className="mt-12 text-xs text-muted-foreground">
          Items with quantity below 5 will display a flashing red border alert
        </p>
      </div>
    </div>
  )
}
