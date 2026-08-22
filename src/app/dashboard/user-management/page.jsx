"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db, functions } from "@/firebase/config"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { IconUserPlus, IconUsers, IconSettings, IconShieldLock, IconEye, IconEyeOff } from "@tabler/icons-react"
import { toast } from "sonner"
import { useAppStore } from "@/store/useAppStore"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function UserManagementPage() {
    const router = useRouter()
    const { userRole, authLoading } = useAppStore()
    
    const [usersList, setUsersList] = useState([])
    const [loading, setLoading] = useState(true)
    
    const [isAddUserOpen, setIsAddUserOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'MANAGEMENT'
    })

    useEffect(() => {
        if (authLoading) return;
        if (userRole !== "ADMIN") {
            router.replace("/dashboard");
            return;
        }

        const usersRef = collection(db, "users");
        // We fetch all users since we can't do complex OR queries easily without composite indexes,
        // but let's assume we can filter on the client if it's small, or use 'in' query.
        const q = query(usersRef, where("role", "in", ["ADMIN", "MANAGEMENT"]));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsersList(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userRole, authLoading, router]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password || !formData.role) {
            toast.error("Please fill in all fields");
            return;
        }
        
        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsSubmitting(true);
        try {
            const createUser = httpsCallable(functions, 'createUser');
            const result = await createUser(formData);
            
            if (result.data?.success) {
                toast.success("User created successfully!");
                setIsAddUserOpen(false);
                setFormData({ email: '', password: '', role: 'MANAGEMENT' });
                setShowPassword(false);
                // Always navigate to permissions page after creation (so Admin can set initial permissions/passwords)
                router.push(`/dashboard/user-management/${result.data.uid}/permissions`);
            }
        } catch (error) {
            console.error("Error creating user:", error);
            toast.error(error.message || "Failed to create user");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || userRole !== "ADMIN") {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <ProtectedRoute>
            <SidebarProvider
                style={{
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)"
                }}>
                <AppSidebar variant="inset" />
                <SidebarInset className="bg-background">
                    <SiteHeader />
                    <div className="flex flex-1 flex-col gap-8 p-6 md:p-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                                    User Management
                                </h2>
                                <p className="text-sm text-muted-foreground">Manage Admin and Management users.</p>
                            </div>
                            
                            <Dialog open={isAddUserOpen} onOpenChange={(open) => {
                                setIsAddUserOpen(open);
                                if (!open) setShowPassword(false);
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="h-10 px-4 font-medium transition-all shadow-sm">
                                        <IconUserPlus className="mr-2 h-4 w-4" />
                                        Create User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Create New User</DialogTitle>
                                        <DialogDescription>
                                            Add a new dashboard user. They will be able to log in with these credentials.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddUser} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} required placeholder="user@example.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Temporary Password *</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="password" 
                                                    name="password" 
                                                    type={showPassword ? "text" : "password"} 
                                                    value={formData.password} 
                                                    onChange={handleFormChange} 
                                                    required 
                                                    placeholder="Min 6 characters" 
                                                    className="pr-10"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? (
                                                        <IconEyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <IconEye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span className="sr-only">
                                                        {showPassword ? "Hide password" : "Show password"}
                                                    </span>
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Role *</Label>
                                            <Select value={formData.role} onValueChange={(val) => setFormData(p => ({...p, role: val}))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create User'}</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground px-6 py-4">User</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Role</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground px-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Loading users...</TableCell>
                                        </TableRow>
                                    ) : usersList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No users found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        usersList.map((userDoc) => (
                                            <TableRow key={userDoc.id} className="group hover:bg-primary/[0.01] transition-all">
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                            <IconUsers className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{userDoc.email}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono tracking-tighter opacity-60">ID: {userDoc.id}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${userDoc.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {userDoc.role === 'ADMIN' ? <IconShieldLock className="h-3 w-3 mr-1" /> : null}
                                                        {userDoc.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs border-primary/20 hover:bg-primary/5 text-primary"
                                                        onClick={() => router.push(`/dashboard/user-management/${userDoc.id}/permissions`)}
                                                    >
                                                        <IconSettings className="h-4 w-4 mr-2" />
                                                        Settings
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    );
}
