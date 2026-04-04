import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { assertInternalApiKey } from "../../../common/auth/internal-api-auth";
import { EvolutionClient, readEvolutionConfigFromRuntime } from "../../integrations/clients/evolution.client";

@Controller("whatsapp")
export class WhatsAppAdminController {
  private ensureInternalAuth(internalApiKeyHeader: string | undefined) {
    assertInternalApiKey(internalApiKeyHeader);
  }

  @Get("connection-state")
  @HttpCode(HttpStatus.OK)
  async getConnectionState(@Headers("x-internal-api-key") internalApiKeyHeader: string | undefined) {
    this.ensureInternalAuth(internalApiKeyHeader);
    const config = readEvolutionConfigFromRuntime();

    if (!config.apiUrl || !config.apiKey) {
      return { success: false, error: "NOT_CONFIGURED", state: "unknown" };
    }

    try {
      const res = await fetch(`${config.apiUrl}/instance/status`, {
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return { success: false, error: "INSTANCE_NOT_FOUND", state: "unknown" };
        }
        return { success: false, error: "API_ERROR", state: "unknown" };
      }

      const data = await res.json();
      const state = (
        data?.state ??
        data?.status ??
        data?.instance?.state ??
        data?.instance?.status ??
        data?.data?.state ??
        data?.data?.status ??
        "unknown"
      ) as string;

      return { success: true, state, data };
    } catch (error) {
      return { success: false, error: "FETCH_ERROR", state: "unknown", detail: String(error) };
    }
  }

  @Get("qr-code")
  @HttpCode(HttpStatus.OK)
  async getQrCode(@Headers("x-internal-api-key") internalApiKeyHeader: string | undefined) {
    this.ensureInternalAuth(internalApiKeyHeader);
    const config = readEvolutionConfigFromRuntime();

    if (!config.apiUrl || !config.apiKey) {
      return { success: false, error: "NOT_CONFIGURED", base64: null };
    }

    try {
      await fetch(`${config.apiUrl}/instance/connect`, {
        method: "POST",
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: config.instance }),
      }).catch(() => undefined);

      const res = await fetch(`${config.apiUrl}/instance/qr`, {
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return { success: false, error: "INSTANCE_NOT_FOUND", base64: null };
        }
        return { success: false, error: "API_ERROR", base64: null };
      }

      const data = await res.json();
      const base64 = data?.data?.Qrcode || data?.data?.qrcode || data?.qrCode || data?.base64 || null;
      return { success: true, base64 };
    } catch (error) {
      return { success: false, error: "FETCH_ERROR", base64: null, detail: String(error) };
    }
  }

  @Post("instance/create")
  @HttpCode(HttpStatus.OK)
  async createInstance(@Headers("x-internal-api-key") internalApiKeyHeader: string | undefined) {
    this.ensureInternalAuth(internalApiKeyHeader);
    const config = readEvolutionConfigFromRuntime();

    if (!config.apiUrl || !config.apiKey) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      const res = await fetch(`${config.apiUrl}/instance/create`, {
        method: "POST",
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: config.instance,
          token: config.apiKey || undefined,
        }),
      });

      if (!res.ok && res.status !== 409) {
        return { success: false, error: "CREATE_FAILED" };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "FETCH_ERROR", detail: String(error) };
    }
  }

  @Post("send")
  @HttpCode(HttpStatus.OK)
  async sendTextMessage(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Body() body: { to?: string; text?: string },
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);
    const to = body.to?.trim() ?? "";
    const text = body.text?.trim() ?? "";

    if (!to || !text) {
      return { success: false, error: "INVALID_PAYLOAD" as const };
    }

    try {
      const evolutionClient = EvolutionClient.fromRuntime();
      await evolutionClient.sendTextMessage(to, text);
      return { success: true };
    } catch (error) {
      return { success: false, error: "WHATSAPP_SEND_FAILED" as const, detail: String(error) };
    }
  }
}
