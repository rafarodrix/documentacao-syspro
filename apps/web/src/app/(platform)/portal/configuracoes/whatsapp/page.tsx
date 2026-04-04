"use client"

import React, { useState, useEffect } from "react"
import { getEvolutionConnectionState, getEvolutionQrCode, createEvolutionInstance } from "@/features/whatsapp/application/whatsapp-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Smartphone, CheckCircle, XCircle } from "lucide-react"

type EvoStateType = "open" | "close" | "connecting" | "unknown" | "missing_instance"

export default function WhatsAppSettingsPage() {
  const [evoState, setEvoState] = useState<EvoStateType>("unknown")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const pollStatus = async () => {
    setIsLoading(true)
    const res = await getEvolutionConnectionState()
    if (res.error === "INSTANCE_NOT_FOUND") {
      setEvoState("missing_instance")
    } else {
      setEvoState(res.state as EvoStateType)
      if (res.data?.instance?.device) {
        setDeviceInfo(res.data.instance.device)
      }
    }
    setIsLoading(false)
  }

  const pollQrCode = async () => {
    const res = await getEvolutionQrCode()
    if (res.base64) {
      setQrCodeData(res.base64)
    }
  }

  const handleCreateInstance = async () => {
    setIsLoading(true)
    await createEvolutionInstance()
    await pollStatus()
  }

  useEffect(() => {
    pollStatus()
    const int = setInterval(pollStatus, 5000)
    return () => clearInterval(int)
  }, [])

  // Poll QR Code se estiver close
  useEffect(() => {
    if (evoState === "close") {
      pollQrCode()
      const qrInt = setInterval(pollQrCode, 4000)
      return () => clearInterval(qrInt)
    }
  }, [evoState])

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp / Evolution GO</h1>
        <p className="text-muted-foreground">
          Gerencie o robô de WhatsApp que dispara automaticamente os alertas de sessões e triagem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status da Conexão
            {evoState === "open" && <Badge className="bg-green-600 hover:bg-green-700">Conectado</Badge>}
            {evoState === "connecting" && <Badge variant="outline" className="text-amber-500 border-amber-500">Conectando...</Badge>}
            {evoState === "close" && <Badge variant="destructive">Desconectado</Badge>}
            {evoState === "missing_instance" && <Badge variant="outline">Instância Ausente</Badge>}
          </CardTitle>
          <CardDescription>
            Certifique-se de que a API esteja online para não perder os envios de mensagens automatizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 bg-slate-50/50 min-h-[300px] border-y">
          
          {isLoading && evoState === "unknown" && (
            <div className="flex flex-col items-center text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p>Consultando Evolution API...</p>
            </div>
          )}

          {evoState === "missing_instance" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="w-16 h-16 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                A sua instância configurada no arquivo ambiente ainda não foi originada na API.
              </p>
              <Button onClick={handleCreateInstance} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar Instância
              </Button>
            </div>
          )}

          {evoState === "close" && (
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <Smartphone className="w-12 h-12 text-slate-400" />
              <p className="text-sm font-medium">O celular hospedeiro está desconectado.</p>
              
              {qrCodeData ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeData} alt="QR Code" className="w-[240px] h-[240px] object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center mt-4">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-2">Gerando QR Code...</span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                Abra o WhatsApp no celular do suporte, vá em &quot;Aparelhos Conectados&quot; e escaneie o código acima.
              </p>
            </div>
          )}

          {evoState === "open" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-inner">
                <CheckCircle className="w-12 h-12 text-green-600 shadow-sm rounded-full bg-white" />
              </div>
              <h3 className="text-xl font-bold">Tudo Certo!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                O WhatsApp está pareado e pronto para disparar eventos automáticos para os seus clientes.
              </p>

              {deviceInfo && (
                <div className="mt-6 p-4 rounded-lg bg-white border flex items-center gap-4">
                  <Smartphone className="w-5 h-5 text-slate-500" />
                  <div className="text-left text-sm">
                    {deviceInfo.pushName && <p className="font-semibold text-slate-700">{deviceInfo.pushName}</p>}
                    <p className="text-slate-500 text-xs">Bateria: {deviceInfo.battery}%</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </CardContent>
        <CardFooter className="pt-6">
          <Button variant="outline" onClick={pollStatus} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar Status
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
