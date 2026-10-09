import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { DeliveryNoteItem } from '@/types';
import { generateId } from '@/lib/uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ItemsFormValues = { items: DeliveryNoteItem[] };

function emptyDeliveryItem(): DeliveryNoteItem {
    return { id: generateId(), description: '', quantity: 1 };
}

export function DeliveryItemsEditor() {
    const { control, register } = useFormContext<ItemsFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });

    return (
        <div className="grid gap-2">
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-24">Qtd.</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <Input
                                        {...register(`items.${index}.description`, { required: true })}
                                        placeholder="Descrição do item"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="1"
                                        {...register(`items.${index}.quantity`, {
                                            valueAsNumber: true,
                                            min: 0,
                                        })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1}
                                    >
                                        <Trash2 />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyDeliveryItem())}>
                <Plus /> Adicionar item
            </Button>
        </div>
    );
}

export { emptyDeliveryItem };
