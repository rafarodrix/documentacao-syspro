"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEvolutionConfig = readEvolutionConfig;
exports.hasEvolutionApiCredentials = hasEvolutionApiCredentials;
function readEvolutionConfig(env = process.env) {
    return {
        apiUrl: env.EVOLUTION_API_URL?.trim() ?? "",
        apiKey: env.EVOLUTION_API_KEY?.trim() ?? "",
        instance: env.EVOLUTION_INSTANCE?.trim() || "Syspro",
        webhookSecret: env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? "",
    };
}
function hasEvolutionApiCredentials(config) {
    return Boolean(config.apiUrl && config.apiKey);
}
