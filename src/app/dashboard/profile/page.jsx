"use client"

import { useAppStore } from "@/store/useAppStore"
import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { IconUser, IconMail, IconPhone } from "@tabler/icons-react"

export default function ProfilePage() {
  const user = useAppStore((state) => state.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "",
    avatar: "",
    phone: ""
  })
  
  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  })

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        setLoading(true)
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const data = userDocSnap.data()
            setUserData({
              name: data.name || data.displayName || "User",
              email: data.email || user.email,
              avatar: data.photoURL || user.photoURL || "",
              phone: data.phone || ""
            })
            setFormData({
              name: data.name || data.displayName || "User",
              phone: data.phone || ""
            })
          } else {
            setUserData({
              name: user.displayName || "User",
              email: user.email,
              avatar: user.photoURL || "",
              phone: ""
            })
            setFormData({
              name: user.displayName || "User",
              phone: ""
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        } finally {
            setLoading(false)
        }
      }
    }

    fetchUserData()
  }, [user])

  const handleSave = async () => {
      if (!user?.uid) return
      setSaving(true)
      try {
          const userDocRef = doc(db, "users", user.uid)
          await updateDoc(userDocRef, {
              name: formData.name,
              phone: formData.phone
          })
          setUserData(prev => ({ ...prev, name: formData.name, phone: formData.phone }))
          toast.success("Profile updated successfully")
      } catch (error) {
          console.error("Error updating profile:", error)
          toast.error("Failed to update profile")
      } finally {
          setSaving(false)
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
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="text-muted-foreground">Manage your personal information and account details.</p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 rounded-2xl border p-6 md:p-8 bg-card shadow-sm mt-4">
            <Avatar className="h-28 w-28 ring-4 ring-primary/10">
              <AvatarImage src={userData.avatar} alt={userData.name} />
              <AvatarFallback className="text-5xl font-semibold bg-primary/5 text-primary">{userData.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <h2 className="text-3xl font-bold">{userData.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                  <IconMail className="size-4" />
                  <span>{userData.email}</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border bg-card text-card-foreground shadow-sm mt-2 overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Personal Information</h3>
                    <p className="text-sm text-muted-foreground">Update your details below to keep your profile up to date.</p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                            <IconUser className="size-4 text-primary" /> Full Name
                        </Label>
                        <Input 
                            id="name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            disabled={loading || saving}
                            className="bg-background/50 h-11"
                        />
                    </div>
                    
                    <div className="space-y-3">
                        <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                            <IconMail className="size-4 text-primary" /> Email Address
                        </Label>
                        <Input 
                            id="email" 
                            value={userData.email} 
                            disabled 
                            className="bg-muted text-muted-foreground h-11"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Email address cannot be changed directly.</p>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                            <IconPhone className="size-4 text-primary" /> Phone Number
                        </Label>
                        <Input 
                            id="phone" 
                            placeholder="+1 (555) 000-0000"
                            value={formData.phone} 
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            disabled={loading || saving}
                            className="bg-background/50 h-11"
                        />
                    </div>
                </div>
            </div>
            
            <div className="bg-muted/30 p-6 flex justify-end gap-4 border-t">
                <Button variant="outline" onClick={() => setFormData({name: userData.name, phone: userData.phone})} disabled={loading || saving}>
                    Discard Changes
                </Button>
                <Button onClick={handleSave} disabled={loading || saving || (formData.name === userData.name && formData.phone === userData.phone)}>
                    Save Changes
                </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
