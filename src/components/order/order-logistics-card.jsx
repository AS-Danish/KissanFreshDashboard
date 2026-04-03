import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { IconMap2 } from "@tabler/icons-react"

export function formatSlotDisplay(slotId) {
    if (!slotId) return "No Slot Assignment";
    try {
        const [datePart, hourPart] = slotId.split('_');
        const [year, month, day] = datePart.split('-');
        const hourObj = parseInt(hourPart, 10);
        
        const ampmStart = hourObj >= 12 ? 'PM' : 'AM';
        const startH = hourObj % 12 || 12;
        
        const nextHourObj = hourObj + 1;
        const ampmEnd = nextHourObj >= 12 && nextHourObj < 24 ? 'PM' : 'AM';
        const endH = nextHourObj % 12 || 12;
        
        return {
            date: `${day}-${month}-${year}`,
            time: `${startH}:00 ${ampmStart} - ${endH}:00 ${ampmEnd}`
        }
    } catch {
        return { date: slotId, time: "" }
    }
}

export function OrderLogisticsCard({ 
    selectedSlot, 
    selectedRider, 
    slots, 
    riders, 
    ridersMap, 
    isAssigning, 
    isChanged, 
    onSlotChange, 
    onRiderChange, 
    onAssign 
}) {
    return (
        <Card className="rounded-xl border shadow-sm bg-muted/5">
            <CardContent className="p-5">
                 <div className="flex items-center gap-2 mb-4 text-primary">
                    <IconMap2 className="h-5 w-5" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Logistics & Assignment</h3>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Select Slot</label>
                         <Select value={selectedSlot} onValueChange={onSlotChange}>
                             <SelectTrigger className="w-full">
                                 <SelectValue placeholder="No Slot Selected" />
                             </SelectTrigger>
                             <SelectContent>
                                 {slots.map(s => {
                                     const fmt = formatSlotDisplay(s.id);
                                     return (
                                         <SelectItem key={s.id} value={s.id}>
                                             Date: {fmt.date} | Time: {fmt.time}
                                         </SelectItem>
                                     )
                                 })}
                             </SelectContent>
                         </Select>
                    </div>
                    <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Select Rider</label>
                         <Select value={selectedRider} onValueChange={onRiderChange} disabled={!selectedSlot || riders.length === 0}>
                             <SelectTrigger className="w-full">
                                 <SelectValue placeholder={!selectedSlot ? "Select Slot First" : riders.length === 0 ? "No Riders Available" : "Select Rider"} />
                             </SelectTrigger>
                             <SelectContent>
                                 {riders.map(r => (
                                     <SelectItem key={r.id} value={r.id}>
                                          {ridersMap[r.riderId || r.id] || r.id} ({r.assignedOrders || 0}/{r.maxOrders || 6})
                                     </SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                    </div>
                 </div>

                 <div className="mt-4 flex justify-end">
                     <Button 
                        onClick={onAssign} 
                        disabled={!selectedSlot || !selectedRider || isAssigning || !isChanged}
                        className="rounded-lg font-bold uppercase tracking-widest text-[10px] px-6"
                    >
                         {isAssigning ? "Assigning..." : "Confirm Logistics"}
                     </Button>
                 </div>
            </CardContent>
        </Card>
    )
}
