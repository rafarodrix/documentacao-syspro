const LEGACY_ADMIN_TO_APP_DUPLICATED_BASES = [
  "/",
  "/cadastros",
  "/chamados",
  "/chamados/[id]",
  "/perfil",
  "/tools",
  "/tools/analisador-xml",
  "/tools/calculadora-difal",
  "/tools/calculadora-precificacao",
  "/tools/configuracao-documentos",
  "/tools/custos-departamento",
  "/tools/fator-producao",
  "/tools/visualizador-danfe",
] as const;

// 13 bases + raiz (/admin) = 14 rotas legadas mapeadas.
export const LEGACY_ADMIN_DUPLICATED_ROUTES_COUNT = 14;

export function mapLegacyAdminPathToApp(pathname: string): string | null {
  if (pathname === "/admin") return "/app";
  if (!pathname.startsWith("/admin/")) return null;

  const suffix = pathname.slice("/admin".length);
  const matchesKnownBase = LEGACY_ADMIN_TO_APP_DUPLICATED_BASES.some((base) => {
    if (base === "/") return false;

    if (base.includes("[id]")) {
      const pattern = "^" + base.replace("[id]", "[^/]+") + "$";
      return new RegExp(pattern).test(suffix);
    }

    return suffix === base || suffix.startsWith(`${base}/`);
  });

  if (matchesKnownBase) {
    return `/app${suffix}`;
  }

  // Fallback seguro para qualquer rota legada /admin residual.
  return pathname.replace(/^\/admin/, "/app");
}

