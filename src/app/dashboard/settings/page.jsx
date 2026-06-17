"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { IconMoon, IconSun, IconDeviceDesktop, IconBell, IconMail, IconDeviceMobile } from "@tabler/icons-react"
import { useAppStore } from "@/store/useAppStore"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/firebase/config"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const user = useAppStore((state) => state.user)
  
  const [notifications, setNotifications] = useState({
      orderUpdates: true,
      promotions: false,
      newsletter: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
      const fetchSettings = async () => {
          if (user?.uid) {
              try {
                  const settingsRef = doc(db, "users", user.uid, "preferences", "notifications")
                  const snap = await getDoc(settingsRef)
                  if (snap.exists()) {
                      setNotifications(snap.data())
                  }
              } catch (e) {
                  console.error("Failed to load settings", e)
              } finally {
                  setLoading(false)
              }
          }
      }
      fetchSettings()
  }, [user])

  const handleToggle = async (key) => {
      const newValue = !notifications[key]
      setNotifications(prev => ({ ...prev, [key]: newValue }))
      
      if (user?.uid) {
          try {
              const settingsRef = doc(db, "users", user.uid, "preferences", "notifications")
              await setDoc(settingsRef, {
                  ...notifications,
                  [key]: newValue
              }, { merge: true })
              toast.success("Preferences updated")
          } catch (e) {
              toast.error("Failed to save preference")
              // revert on failure
              setNotifications(prev => ({ ...prev, [key]: !newValue }))
          }
      }
  }

  return (
    <SidebarProvider
      style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)"
      }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
          <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">Manage your app preferences and notification settings.</p>
          </div>
          
          <div className="grid gap-6">
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                  <div className="space-y-2 mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                          <IconDeviceDesktop className="size-5 text-primary" /> Appearance
                      </h2>
                      <p className="text-sm text-muted-foreground">Customize how the dashboard looks on your device.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        onClick={() => setTheme('light')}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 border shadow-sm">
                              <IconSun className="size-6" />
                          </div>
                          <span className="font-semibold text-sm">Light</span>
                      </div>
                      
                      <div 
                        onClick={() => setTheme('dark')}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <div className="size-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-100 border border-slate-700 shadow-sm">
                              <IconMoon className="size-6" />
                          </div>
                          <span className="font-semibold text-sm">Dark</span>
                      </div>

                      <div 
                        onClick={() => setTheme('system')}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <div className="size-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-800 flex items-center justify-center text-slate-500 border shadow-sm">
                              <IconDeviceDesktop className="size-6" />
                          </div>
                          <span className="font-semibold text-sm">System</span>
                      </div>
                  </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                  <div className="space-y-2 mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                          <IconBell className="size-5 text-primary" /> Notifications
                      </h2>
                      <p className="text-sm text-muted-foreground">Choose what updates you want to receive.</p>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-border/50 pb-6">
                          <div className="space-y-1">
                              <Label className="text-base font-semibold flex items-center gap-2">
                                  <IconDeviceMobile className="size-4 text-muted-foreground" /> Order Updates
                              </Label>
                              <p className="text-sm text-muted-foreground max-w-[80%]">Receive push notifications for new orders and status changes.</p>
                          </div>
                          <Switch 
                              checked={notifications.orderUpdates} 
                              onCheckedChange={() => handleToggle('orderUpdates')} 
                              disabled={loading}
                          />
                      </div>
                      
                      <div className="flex items-center justify-between border-b border-border/50 pb-6">
                          <div className="space-y-1">
                              <Label className="text-base font-semibold flex items-center gap-2">
                                  <IconMail className="size-4 text-muted-foreground" /> Promotions & Offers
                              </Label>
                              <p className="text-sm text-muted-foreground max-w-[80%]">Get emails about new discounts and special features.</p>
                          </div>
                          <Switch 
                              checked={notifications.promotions} 
                              onCheckedChange={() => handleToggle('promotions')} 
                              disabled={loading}
                          />
                      </div>

                      <div className="flex items-center justify-between">
                          <div className="space-y-1">
                              <Label className="text-base font-semibold flex items-center gap-2">
                                  <IconMail className="size-4 text-muted-foreground" /> Weekly Digest
                              </Label>
                              <p className="text-sm text-muted-foreground max-w-[80%]">A weekly email summarizing your sales and top products.</p>
                          </div>
                          <Switch 
                              checked={notifications.newsletter} 
                              onCheckedChange={() => handleToggle('newsletter')} 
                              disabled={loading}
                          />
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
