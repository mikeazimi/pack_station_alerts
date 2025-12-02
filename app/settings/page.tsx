import { SettingsForm } from "@/components/settings-form"
import { Navigation } from "@/components/navigation"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure your ShipHero credentials
              </p>
            </div>
          </div>
          <Navigation />
        </div>

        {/* Settings Form */}
        <SettingsForm />
      </div>
    </div>
  )
}

