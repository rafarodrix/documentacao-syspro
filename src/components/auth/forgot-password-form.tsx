"use client"

import { useForgotPassword } from "@/hooks/use-forgot-password"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ForgotPasswordForm() {
  const { formState, setEmail, setSuccess, submitRequest } = useForgotPassword()
  const { email, loading, error, success } = formState
  const hasError = !!error

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitRequest()
  }

  return (
    <AuthLayoutWrapper
      title="Recuperar Senha"
      description="Digite seu e-mail para receber as instruções."
      backButton
    >
      {success ? (
        // ─── Estado de Sucesso ──────────────────────────────────────────────
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 py-4">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-50">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Verifique seu e-mail</h3>
            {/* ✅ MELHORIA: Mensagem neutra que não confirma se o email existe */}
            <p className="text-sm text-muted-foreground">
              Se houver uma conta cadastrada para <strong>{email}</strong>, você receberá
              um link de recuperação em breve. Verifique também a pasta de spam.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setSuccess(false)}>
            Tentar outro e-mail
          </Button>
        </div>
      ) : (
        // ─── Formulário ─────────────────────────────────────────────────────
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {hasError && (
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

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={cn("text-xs uppercase font-bold transition-colors", hasError ? "text-red-500" : "text-muted-foreground")}
            >
              E-mail
            </Label>
            <div className="relative group">
              <Mail
                aria-hidden
                className={cn("absolute left-3 top-3 h-5 w-5 pointer-events-none transition-colors", hasError ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}
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
                disabled={loading}
                aria-invalid={hasError}
                aria-describedby={hasError ? "forgot-error" : undefined}
                className={cn(
                  "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                  hasError
                    ? "border-red-500 focus-visible:ring-red-500/30 bg-red-50 text-red-900 placeholder:text-red-400"
                    : "focus-visible:border-primary/50"
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-11 font-medium shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all"
          >
            {loading
              ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enviando...</span>
              : "Enviar Link de Recuperação"
            }
          </Button>
        </form>
      )}
    </AuthLayoutWrapper>
  )
}