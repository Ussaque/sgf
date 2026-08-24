import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { BankAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const CURRENCIES = ['MZN', 'USD', 'ZAR', 'EUR'];

type AccountsFormValues = { bank_accounts: BankAccount[] };

export function emptyBankAccount(): BankAccount {
    return {
        id: crypto.randomUUID(),
        bank_name: '',
        account_holder: '',
        account_number: '',
        nib: '',
        iban: '',
        swift_code: '',
        currency: 'MZN',
    };
}

export function BankAccountsEditor() {
    const { control, register } = useFormContext<AccountsFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: 'bank_accounts' });

    return (
        <div className="grid gap-3">
            {fields.map((field, index) => (
                <Card key={field.id}>
                    <CardContent className="grid gap-3 pt-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">Banco</label>
                                    <Input
                                        placeholder="ex: BCI, Millennium bim"
                                        {...register(`bank_accounts.${index}.bank_name`, { required: true })}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">Titular da conta</label>
                                    <Input
                                        placeholder="Nome no banco"
                                        {...register(`bank_accounts.${index}.account_holder`)}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">Número de conta</label>
                                    <Input {...register(`bank_accounts.${index}.account_number`, { required: true })} />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">Moeda</label>
                                    <select
                                        className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                                        {...register(`bank_accounts.${index}.currency`)}
                                    >
                                        {CURRENCIES.map((currency) => (
                                            <option key={currency} value={currency}>
                                                {currency}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">NIB (opcional)</label>
                                    <Input {...register(`bank_accounts.${index}.nib`)} />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">IBAN (opcional)</label>
                                    <Input
                                        placeholder="ex: MZ59..."
                                        {...register(`bank_accounts.${index}.iban`)}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium">SWIFT / BIC (opcional)</label>
                                    <Input
                                        placeholder="ex: BCIMMZMX"
                                        {...register(`bank_accounts.${index}.swift_code`)}
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => remove(index)}
                                title="Remover conta"
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(emptyBankAccount())}
                className="w-fit"
            >
                <Plus /> Adicionar conta bancária
            </Button>
        </div>
    );
}
