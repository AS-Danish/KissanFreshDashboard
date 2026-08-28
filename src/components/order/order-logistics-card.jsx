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
import { Label } from "@/components/ui/label"

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
        <Card>
            <CardContent className="p-5">
                 <div className="flex items-center gap-2 mb-4 text-primary">
                    <IconMap2 className="h-5 w-5" />
                    <h3 className="text-sm font-semibold text-foreground">Delivery assignment</h3>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <Label htmlFor="order-slot">Delivery slot</Label>
                         <Select value={selectedSlot} onValueChange={onSlotChange}>
                             <SelectTrigger id="order-slot" className="w-full">
                                 <SelectValue placeholder="No Slot Selected" />
                             </SelectTrigger>
                             <SelectContent>
                                 {slots.map(s => {
                                     const fmt = formatSlotDisplay(s.id);
                                     return (
                                         <SelectItem key={s.id} value={s.id}>
                                             {fmt.date} · {fmt.time}
                                         </SelectItem>
                                     )
                                 })}
                             </SelectContent>
                         </Select>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="order-rider">Delivery rider</Label>
                         <Select value={selectedRider} onValueChange={onRiderChange} disabled={!selectedSlot || riders.length === 0}>
                             <SelectTrigger id="order-rider" className="w-full">
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

                 <div className="mt-5 flex justify-end">
                     <Button 
                        onClick={onAssign} 
                        disabled={!selectedSlot || !selectedRider || isAssigning || !isChanged}
                        className="w-full rounded-lg px-6 sm:w-auto"
                    >
                         {isAssigning ? "Saving assignment…" : "Save assignment"}
                     </Button>
                 </div>
            </CardContent>
        </Card>
    )
}
