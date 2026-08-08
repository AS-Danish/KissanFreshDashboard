"use client"

import { useState } from "react"
import { db, storage } from "@/firebase/config"
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { IconLoader2, IconPhotoPlus } from "@tabler/icons-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export default function OffersNotificationPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const [isInstant, setIsInstant] = useState(true)
  const [scheduledFor, setScheduledFor] = useState("")
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !body) {
      toast.error("Please provide both title and body for the notification.")
      return
    }
    
    if (!isInstant && !scheduledFor) {
      toast.error("Please provide a scheduled time.")
      return
    }

    setLoading(true)

    try {
      let imageUrl = null

      if (image) {
        const imageRef = ref(storage, `offer_notifications/${Date.now()}_${image.name}`)
        const uploadResult = await uploadBytes(imageRef, image)
        imageUrl = await getDownloadURL(uploadResult.ref)
      }

      const offerData = {
        title,
        body,
        imageUrl,
        isInstant,
        status: "PENDING",
        createdAt: serverTimestamp(),
      }

      if (!isInstant) {
        offerData.scheduledFor = Timestamp.fromDate(new Date(scheduledFor))
      } else {
        offerData.scheduledFor = serverTimestamp()
      }

      await addDoc(collection(db, "offer_notifications"), offerData)

      toast.success(isInstant ? "Instant notification triggered successfully!" : "Offer scheduled successfully!")
      
      setTitle("")
      setBody("")
      setImage(null)
      setImagePreview("")
      setIsInstant(true)
      setScheduledFor("")
    } catch (error) {
      console.error("Error creating offer:", error)
      toast.error("Failed to create offer notification.")
    } finally {
      setLoading(false)
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
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Offer Notifications</h1>
            <p className="text-muted-foreground">
              Create and send rich push notifications to all users instantly or schedule them for later.
            </p>
          </div>

          <Card className="border-t-4 border-t-primary shadow-lg rounded-2xl overflow-hidden transition-all">
            <form onSubmit={handleSubmit}>
              <CardHeader className="bg-muted/30 pb-8">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-2 rounded-lg">
                    🔔
                  </span>
                  New Campaign
                </CardTitle>
                <CardDescription className="text-base">
                  Fill out the details below to broadcast an offer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="title" className="text-base font-semibold">Notification Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., 🚀 Huge Weekend Sale on Fresh Fruits!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12 text-lg"
                      required
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="body" className="text-base font-semibold">Notification Body</Label>
                    <Textarea
                      id="body"
                      placeholder="e.g., Get up to 50% off on all organic apples. Order now while stock lasts."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="min-h-[120px] text-base resize-none"
                      required
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label className="text-base font-semibold">Promotional Image (Optional)</Label>
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <label 
                          htmlFor="image-upload" 
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/40 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <IconPhotoPlus className="w-8 h-8 mb-3 text-primary/70" stroke={1.5} />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG or WEBP (Max 2MB)</p>
                          </div>
                          <input 
                            id="image-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      {imagePreview && (
                        <div className="w-32 h-32 relative rounded-xl overflow-hidden border border-border shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full px-2 py-0.5 hover:bg-black/70 transition"
                            onClick={() => { setImage(null); setImagePreview("") }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card shadow-sm space-y-6">
                    <div className="flex flex-row items-center justify-between">
                      <div className="space-y-1.5">
                        <Label className="text-base font-semibold">Send Immediately</Label>
                        <p className="text-sm text-muted-foreground">
                          If disabled, you can pick a specific date and time.
                        </p>
                      </div>
                      <Switch
                        checked={isInstant}
                        onCheckedChange={setIsInstant}
                        className="scale-125 mr-2"
                      />
                    </div>

                    {!isInstant && (
                      <div className="grid gap-3 pt-4 border-t border-border animate-in slide-in-from-top-2">
                        <Label htmlFor="schedule" className="text-base font-semibold">Schedule Time</Label>
                        <Input
                          id="schedule"
                          type="datetime-local"
                          value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          className="h-12 text-base max-w-md"
                          min={new Date().toISOString().slice(0, 16)}
                          required={!isInstant}
                        />
                        <p className="text-sm text-muted-foreground">
                          Note: Scheduled notifications are processed in 4-hour intervals.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-6 pb-6 px-6">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : isInstant ? (
                    "🚀 Broadcast Now"
                  ) : (
                    "📅 Schedule Notification"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
