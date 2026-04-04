"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const evolution_config_1 = require("./evolution-config");
class WhatsAppService {
    baseUrl;
    apiKey;
    instance;
    constructor(baseUrl, apiKey, instance) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.instance = instance;
    }
    static fromEnv(env = process.env) {
        const config = (0, evolution_config_1.readEvolutionConfig)(env);
        return new WhatsAppService(config.apiUrl, config.apiKey, config.instance);
    }
    async sendMessage(number, text) {
        if (!(0, evolution_config_1.hasEvolutionApiCredentials)({ apiUrl: this.baseUrl, apiKey: this.apiKey })) {
            console.warn("[WhatsAppService] Credenciais faltando. Pulo de envio de mensagem.");
            return;
        }
        const url = `${this.baseUrl}/send/text`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "apikey": this.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: this.instance,
                number: this.normalizeNumber(number),
                text,
                delay: 1200,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao enviar WhatsApp: ${response.status} - ${errorText}`);
        }
    }
    normalizeNumber(number) {
        // Remove non-digits and ensure it has the correct format for Evolution API
        let cleaned = number.replace(/\D/g, "");
        if (!cleaned.startsWith("55")) {
            cleaned = "55" + cleaned;
        }
        return cleaned;
    }
}
exports.WhatsAppService = WhatsAppService;
