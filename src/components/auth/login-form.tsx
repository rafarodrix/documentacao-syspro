"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useLogin } from "@/hooks/use-login"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"

export function LoginForm() {
  const {
    email, setEmail,
    password, setPassword,
    isLoading, error, submitLogin,
  } = useLogin()

  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitLogin()
  }

  const hasError = !!error

  return (
    <AuthLayoutWrapper
      title="Acesso ao Portal"
      description="Entre com suas credenciais para acessar o sistema."
      backButton={true}
    >
      <div className="space-y-5">

        {/* ── Alerta de Erro ──────────────────────────────────── */}
        {hasError && (
          <Alert
            variant="destructive"
            role="alert"
            aria-live="assertive"
            className="animate-in fade-in zoom-in-95 duration-300 border-red-500/50 bg-red-500/10 text-red-600"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="font-semibold">Falha no login</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Formulário ──────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-label="Formulário de login"
        >
          {/* E-mail */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={cn(
                "text-xs uppercase font-semibold tracking-wider transition-colors",
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
                  hasError
                    ? "text-red-500"
                    : "text-muted-foreground group-focus-within:text-primary",
                )}
              />
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                required
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                aria-invalid={hasError}
                aria-describedby={hasError ? "login-error" : undefined}
                className={cn(
                  "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                  hasError
                    ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300"
                    : "focus-visible:border-primary/50",
                )}
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className={cn(
                  "text-xs uppercase font-semibold tracking-wider transition-colors",
                  hasError ? "text-red-500" : "text-muted-foreground",
                )}
              >
                Senha
              </Label>
              <Link
                href="/forgot-password"
                tabIndex={isLoading ? -1 : 0}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <div className="relative group">
              <Lock
                aria-hidden="true"
                className={cn(
                  "absolute left-3 top-3 h-5 w-5 transition-colors duration-200 pointer-events-none",
                  hasError
                    ? "text-red-500"
                    : "text-muted-foreground group-focus-within:text-primary",
                )}
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                aria-invalid={hasError}
                aria-describedby={hasError ? "login-error" : undefined}
                className={cn(
                  "pl-10 pr-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
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
                  : <Eye className="h-4 w-4" aria-hidden="true" />
                }
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={cn(
              "w-full h-11 text-base font-medium shadow-md transition-all mt-2",
              "hover:shadow-lg hover:translate-y-[-1px]",
              isLoading && "opacity-80 cursor-not-allowed hover:translate-y-0",
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verificando...
              </span>
            ) : (
              "Entrar no Sistema"
            )}
          </Button>
        </form>

        {/* ── Rodapé ──────────────────────────────────────────── */}
        <div className="space-y-4 pt-1">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Precisa de acesso?
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Entre em contato pelo{" "}
            <Link
              href="https://wa.me/5534997713731?text=Olá"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              WhatsApp
            </Link>
            {" "}ou fale com o{" "}
            <Link
              href="/docs/suporte"
              className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              suporte técnico
            </Link>
            .
          </p>
        </div>

      </div>
    </AuthLayoutWrapper>
  )
}