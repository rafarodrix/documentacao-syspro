"use client";

import { useFormContext } from "react-hook-form";
import type { CreateCompanyInput } from "@dosc-syspro/contracts/company";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@dosc-syspro/ui";
import { Loader2, MapPin, Search } from "lucide-react";
import { Card, CardContent } from "@dosc-syspro/ui";

interface CompanyAddressTabProps {
  isLoadingCep: boolean;
  onCepChange: (value: string) => void;
}

export function CompanyAddressTab({ isLoadingCep, onCepChange }: CompanyAddressTabProps) {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Endereco da sede</p>
            <p className="text-xs text-muted-foreground">
              Informe o CEP para preenchimento automatico via ViaCEP. Campos podem ser ajustados manualmente.
            </p>
          </div>
        </div>

        {/* CEP + Pais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address.cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      {...field}
                      value={toInputValue(field.value)}
                      onChange={(e) => onCepChange(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      {isLoadingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.pais"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pais</FormLabel>
                <FormControl>
                  <Input {...field} value={toInputValue(field.value)} placeholder="BR" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Logradouro completo */}
        <FormField
          control={form.control}
          name="address.logradouro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logradouro</FormLabel>
              <FormControl>
                <Input placeholder="Rua, Av., Travessa..." {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address.numero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero</FormLabel>
                <FormControl>
                  <Input id="address-numero" {...field} value={toInputValue(field.value)} placeholder="123" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.complemento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Sala, Andar, Bloco..." {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.bairro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address.cidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UF</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={2}
                    className="uppercase"
                    value={toInputValue(field.value)}
                    placeholder="SP"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
