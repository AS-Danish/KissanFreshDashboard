"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs } from "@/services/loggerService";
import * as XLSX from "xlsx";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchLogs = async (isLoadMore = false) => {
        setLoading(true);
        try {
            const result = await getAuditLogs(20, isLoadMore ? lastDoc : null);
            if (isLoadMore) {
                setLogs(prev => [...prev, ...result.logs]);
            } else {
                setLogs(result.logs);
            }
            setLastDoc(result.lastVisible);
            setHasMore(result.hasMore);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            toast.error("Failed to load audit logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleExportExcel = () => {
        if (logs.length === 0) {
            toast.error("No data to export.");
            return;
        }

        const excelData = logs.map(log => {
            let detailsStr = "";
            try {
                detailsStr = typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details);
            } catch (e) {
                detailsStr = "N/A";
            }

            return {
                "Log ID": log.id,
                "Action": log.action,
                "Entity Type": log.entityType,
                "Entity ID": log.entityId,
                "User Email": log.userEmail,
                "User ID": log.userId,
                "Timestamp": log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : "N/A",
                "Details": detailsStr
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

        XLSX.writeFile(workbook, `Audit_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const getActionColor = (action) => {
        if (action.includes("ADDED")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
        if (action.includes("UPDATED") || action.includes("CHANGED")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
        if (action.includes("DELETED")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    };

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => fetchLogs(false)} disabled={loading} className="flex items-center gap-2">
                                <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button onClick={handleExportExcel} disabled={logs.length === 0} className="flex items-center gap-2">
                                <IconDownload className="h-4 w-4" />
                                Export Excel
                            </Button>
                        </div>
                    </div>

                    <Card className="border-0 shadow-sm relative overflow-hidden flex-1 flex flex-col min-h-[400px]">
                        <CardHeader className="border-b border-border/50">
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>System actions performed by administrators.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto flex-1">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 && !loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                No audit logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`${getActionColor(log.action)} px-2 py-1 text-xs border-transparent`}>
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm font-mono">
                                                    {log.entityType} <br/>
                                                    <span className="text-xs text-muted-foreground">{log.entityId}</span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {log.userEmail}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                                                    {JSON.stringify(log.details)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {loading && (
                                <div className="p-4 flex justify-center">
                                    <span className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                            )}
                            {hasMore && !loading && (
                                <div className="p-4 flex justify-center border-t border-border/50 bg-muted/20">
                                    <Button variant="outline" onClick={() => fetchLogs(true)}>Load More</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
