import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
    value?: string; // yyyy-mm-dd
    onChange: (value: string) => void;
    placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Seleciona uma data' }: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const selected = value ? new Date(`${value}T00:00:00`) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'w-full justify-start font-normal',
                            !selected && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon />
                        {selected ? format(selected, 'dd/MM/yyyy', { locale: pt }) : placeholder}
                    </Button>
                }
            />
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => {
                        if (date) {
                            onChange(date.toISOString().slice(0, 10));
                            setOpen(false);
                        }
                    }}
                    locale={pt}
                />
            </PopoverContent>
        </Popover>
    );
}
