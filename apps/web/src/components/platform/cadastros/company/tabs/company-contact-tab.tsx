"use client";

import { useFormContext } from "react-hook-form";
import type { CreateCompanyInput } from "@dosc-syspro/contracts/company";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPhone } from "@/lib/formatters";

export function CompanyContactTab() {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Phone className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Canais de comunicacao</p>
          <p className="text-xs text-muted-foreground">E-mails e telefones gerais da empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="emailContato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail Comercial</FormLabel>
              <FormControl>
                <Input type="email" placeholder="comercial@empresa.com.br" {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emailFinanceiro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail Financeiro</FormLabel>
              <FormControl>
                <Input type="email" placeholder="financeiro@empresa.com.br" {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={toInputValue(field.value)}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={toInputValue(field.value)}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://empresa.com.br" {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="observacoes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observacoes internas</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Anotacoes internas sobre a empresa..." {...field} value={toInputValue(field.value)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      </CardContent>
    </Card>
  );
}
