"use client"

import { useState } from "react"
import { useResetPassword } from "@/hooks/use-reset-password"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function ResetPasswordForm() {
  const {
    formState: { password, confirmPassword, loading, error, token },
    setPassword,
    setConfirmPassword,
    submitReset,
    passwordStrength,  // ✅ do hook melhorado
  } = useResetPassword()

  // Toggle de visibilidade local para cada campo
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitReset()
  }

  // Token ausente = link quebrado ou expirado
  if (!token) {
    return (
      <AuthLayoutWrapper title="Link Inválido" description="Solicitação não encontrada." backButton>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            O link de recuperação é inválido ou expirou. Links são válidos por 1 hora.
          </AlertDescription>
        </Alert>
        <Button className="w-full mt-4" asChild>
          <a href="/forgot-password">Solicitar novo link</a>
        </Button>
      </AuthLayoutWrapper>
    )
  }

  return (
    <AuthLayoutWrapper
      title="Redefinir Senha"
      description="Crie uma nova senha segura para sua conta."
      backButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {error && (
          <Alert
            variant="destructive"
            role="alert"
            aria-live="assertive"
            className="border-red-500/50 bg-red-500/10 text-red-600 animate-in fade-in zoom-in-95 duration-300"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="password" className={cn("text-xs uppercase font-semibold", error ? "text-red-500" : "text-muted-foreground")}>
              Nova Senha
            </Label>
            <div className="relative group">
              <Lock
                aria-hidden
                className={cn("absolute left-3 top-3 h-5 w-5 pointer-events-none transition-colors", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-invalid={!!error}
                className={cn("pl-10 pr-10 h-11 bg-muted/30 border-muted-foreground/20 transition-all", error && "border-red-500 bg-red-50")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((p) => !p)}
                disabled={loading}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>

            {/* ✅ Barra de força de senha */}
            {password.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <div className="flex gap-1 h-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-300",
                        passwordStrength.score > i ? passwordStrength.color : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <p className={cn(
                  "text-[11px] font-medium transition-colors",
                  passwordStrength.passes ? "text-green-600" : "text-orange-500"
                )}>
                  {passwordStrength.label}
                  {!passwordStrength.passes && " — adicione letras maiúsculas, números ou símbolos"}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={cn("text-xs uppercase font-semibold", error ? "text-red-500" : "text-muted-foreground")}>
              Confirmar Senha
            </Label>
            <div className="relative group">
              <Lock
                aria-hidden
                className={cn("absolute left-3 top-3 h-5 w-5 pointer-events-none transition-colors", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}
              />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a nova senha"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                aria-invalid={!!error}
                className={cn(
                  "pl-10 pr-10 h-11 bg-muted/30 border-muted-foreground/20 transition-all",
                  error && "border-red-500 bg-red-50",
                  // ✅ Feedback visual imediato se as senhas não coincidem
                  confirmPassword.length > 0 && password !== confirmPassword && "border-orange-400",
                  confirmPassword.length > 0 && password === confirmPassword && "border-green-400",
                )}
              />
              <button
                type="button"
                aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                onClick={() => setShowConfirm((p) => !p)}
                disabled={loading}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            {/* Hint de match */}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-[11px] text-orange-500 animate-in fade-in duration-200">
                As senhas não coincidem ainda
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !passwordStrength.passes || password !== confirmPassword}
          aria-busy={loading}
          className="w-full h-11"
        >
          {loading
            ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Salvando...</span>
            : "Alterar Senha"
          }
        </Button>
      </form>
    </AuthLayoutWrapper>
  )
}