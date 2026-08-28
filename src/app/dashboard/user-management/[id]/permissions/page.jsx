"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/firebase/config"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { IconChevronLeft, IconDeviceFloppy, IconEye, IconEyeOff, IconKey } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/firebase/config"
import { logAdminAction } from "@/services/loggerService"
import { toast } from "sonner"
import { useAppStore } from "@/store/useAppStore"

const PERMISSIONS_LIST = [
    { key: "Product Management", label: "Product Management", desc: "Access to view and manage products." },
    { key: "Stock Management", label: "Stock Management", desc: "Access to modify inventory counts." },
    { key: "Order Management", label: "Order Management", desc: "Access to view and update order status." },
    { key: "Rider Management", label: "Rider Management", desc: "Manage delivery riders and their status." },
    { key: "Slot Management", label: "Slot Management", desc: "Manage delivery slots." },
    { key: "Manage Categories", label: "Manage Categories", desc: "Add, edit, or remove store categories." },
    { key: "Offers Notification", label: "Offers Notification", desc: "Send out push notifications for offers." },
    { key: "Coupon Management", label: "Coupon Management", desc: "Create and distribute coupons." },
    { key: "Theme Management", label: "Theme Management", desc: "Change application themes and branding." },
    { key: "Settings", label: "Settings", desc: "Access secondary settings panel." },
    { key: "Sales Report", label: "Sales Report", desc: "View detailed financial reports." },
    { key: "Audit Logs", label: "Audit Logs", desc: "View system audit trail." }
];

export default function PermissionsPage({ params }) {
    const router = useRouter()
    const { userRole, authLoading } = useAppStore()
    const resolvedParams = use(params)
    const userId = resolvedParams.id
    const [targetUser, setTargetUser] = useState(null)
    const [permissions, setPermissions] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        if (authLoading) return;
        if (userRole !== "ADMIN") {
            router.replace("/dashboard");
            return;
        }

        const fetchUser = async () => {
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    setTargetUser({ id: userDocSnap.id, ...userDocSnap.data() });
                    setPermissions(userDocSnap.data().permissions || {});
                } else {
                    toast.error("User not found");
                    router.push("/dashboard/user-management");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                toast.error("Failed to load user data");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId, userRole, authLoading, router]);

    const handleToggle = (key) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, {
                permissions: permissions
            });
            await logAdminAction("USER_PERMISSIONS_CHANGED", "USER", userId, { 
                email: targetUser.email,
                permissions: permissions
            });
            toast.success("Permissions updated successfully!");
        } catch (error) {
            console.error("Error saving permissions:", error);
            toast.error("Failed to save permissions.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setChangingPassword(true);
        try {
            const updatePassword = httpsCallable(functions, 'updateUserPassword');
            const result = await updatePassword({ uid: userId, newPassword: newPassword });
            
            if (result.data?.success) {
                toast.success("Password updated successfully!");
                setNewPassword("");
                await logAdminAction("USER_PASSWORD_CHANGED", "USER", userId, { 
                    email: targetUser.email 
                });
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(error.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    if (authLoading || userRole !== "ADMIN") {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
            <>
                    <div className="dashboard-page dashboard-page-wide">
                        <div className="flex flex-col gap-4">
                            <Button 
                                variant="ghost" 
                                className="w-fit pl-0 text-muted-foreground hover:text-foreground"
                                onClick={() => router.push("/dashboard/user-management")}
                            >
                                <IconChevronLeft className="h-4 w-4 mr-1" />
                                Back to User Management
                            </Button>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                                        Manage Permissions
                                    </h2>
                                    {targetUser && (
                                        <p className="text-sm text-muted-foreground">
                                            Configuring access for <strong>{targetUser.email}</strong> ({targetUser.role})
                                        </p>
                                    )}
                                </div>
                                <Button 
                                    onClick={handleSave} 
                                    disabled={loading || saving}
                                    className="shadow-sm"
                                >
                                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                                    {saving ? "Saving..." : "Save Permissions"}
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-muted-foreground">Loading permissions...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {PERMISSIONS_LIST.map((perm) => (
                                    <Card key={perm.key} className="flex flex-row items-center justify-between p-6 shadow-sm border-border/50">
                                        <div className="space-y-1 mr-4">
                                            <Label htmlFor={perm.key} className="text-sm font-semibold uppercase tracking-tight">
                                                {perm.label}
                                            </Label>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {perm.desc}
                                            </p>
                                        </div>
                                        <Switch 
                                            id={perm.key} 
                                            checked={!!permissions[perm.key]} 
                                            onCheckedChange={() => handleToggle(perm.key)}
                                            disabled={targetUser?.role === "ADMIN"}
                                        />
                                    </Card>
                                ))}
                            </div>
                        )}
                        
                        
                        {targetUser?.role === "ADMIN" && (
                            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium">
                                Note: This user is an ADMIN. They automatically have access to all modules regardless of individual toggles.
                            </div>
                        )}

                        <Card className="mt-8 border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/50">
                                <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
                                    <IconKey className="mr-2 h-5 w-5" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>
                                    Force a password reset for this user. They will be logged out of their current session.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleChangePassword}>
                                <CardContent className="pt-6">
                                    <div className="relative grid gap-3 max-w-sm">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input
                                            id="new-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            minLength={6}
                                            className="pr-10"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-7 h-10 w-10 hover:bg-transparent"
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/20 border-t border-border/50 py-4">
                                    <Button type="submit" variant="destructive" disabled={changingPassword}>
                                        {changingPassword ? "Updating..." : "Update Password"}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
            </>
    );
}
