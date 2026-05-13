"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRegister } from "@/features/auth/interface"
import { Button, Input, Label, Alert, AlertDescription, AlertTitle } from "@dosc-syspro/ui"
import { Loader2, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function RegisterForm() {
  const { isLoading, error, submitRegister } = useRegister()
  const [showPassword, setShowPassword] = useState(false)
  const hasError = !!error

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    submitRegister(formData)
  }

  return (
    <AuthLayoutWrapper
      title="Crie sua conta"
      description="Junte-se à equipe da sua empresa no Syspro ERP."
    >
      <div className="space-y-5">
        {hasError && (
          // ds-allow: status
          <Alert
            variant="destructive"
            role="alert"
            aria-live="assertive"
            className="animate-in fade-in zoom-in-95 duration-300 border-red-500/50 bg-red-500/10 text-red-600"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="font-semibold">Erro no cadastro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-label="Formulário de cadastro"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className={cn(
                  "text-xs uppercase font-semibold tracking-wider transition-colors",
                  // ds-allow: status
                  hasError ? "text-red-500" : "text-muted-foreground",
                )}
              >
                Nome Completo
              </Label>
              <div className="relative group">
                <User
                  aria-hidden="true"
                  className={cn(
                    "absolute left-3 top-3 h-5 w-5 transition-colors duration-200 pointer-events-none",
                    // ds-allow: status
                    hasError
                      ? "text-red-500"
                      : "text-muted-foreground group-focus-within:text-primary",
                  )}
                />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ex: Meu Nome Completo"
                  required
                  autoComplete="name"
                  disabled={isLoading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? "register-error" : undefined}
                  className={cn(
                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                    // ds-allow: status
                    hasError
                      ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300"
                      : "focus-visible:border-primary/50",
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={cn(
                  "text-xs uppercase font-semibold tracking-wider transition-colors",
                  // ds-allow: status
                  hasError ? "text-red-500" : "text-muted-foreground",
                )}
              >
                E-mail Corporativo
              </Label>
              <div className="relative group">
                <Mail
                  aria-hidden="true"
                  className={cn(
                    "absolute left-3 top-3 h-5 w-5 transition-colors duration-200 pointer-events-none",
                    // ds-allow: status
                    hasError
                      ? "text-red-500"
                      : "text-muted-foreground group-focus-within:text-primary",
                  )}
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  required
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={isLoading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? "register-error" : undefined}
                  className={cn(
                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                    // ds-allow: status
                    hasError
                      ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300"
                      : "focus-visible:border-primary/50",
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={cn(
                  "text-xs uppercase font-semibold tracking-wider transition-colors",
                  // ds-allow: status
                  hasError ? "text-red-500" : "text-muted-foreground",
                )}
              >
                Senha
              </Label>
              <div className="relative group">
                <Lock
                  aria-hidden="true"
                  className={cn(
                    "absolute left-3 top-3 h-5 w-5 transition-colors duration-200 pointer-events-none",
                    // ds-allow: status
                    hasError
                      ? "text-red-500"
                      : "text-muted-foreground group-focus-within:text-primary",
                  )}
                />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? "register-error" : undefined}
                  className={cn(
                    "pl-10 pr-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                    // ds-allow: status
                    hasError
                      ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300"
                      : "focus-visible:border-primary/50",
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  tabIndex={isLoading ? -1 : 0}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground ml-1">Mínimo de 6 caracteres</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 p-3 rounded-md text-xs text-primary/80">
            <strong>Nota:</strong> Se você deseja <strong>contratar o Syspro</strong> para sua empresa, entre em contato com nosso setor comercial.
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={cn(
              "w-full h-11 text-base font-medium shadow-md transition-all",
              "hover:shadow-lg hover:translate-y-[-1px]",
              isLoading && "opacity-80 cursor-not-allowed hover:translate-y-0",
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Criando Conta...
              </span>
            ) : (
              "Criar Minha Conta"
            )}
          </Button>
        </form>

        <div className="space-y-4 pt-1">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Já tem acesso?</span>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              tabIndex={isLoading ? -1 : 0}
              className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Fazer login na sua conta
            </Link>
          </div>
        </div>
      </div>
    </AuthLayoutWrapper>
  )
}
