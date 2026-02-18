import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Política de Privacidade | Trilink Software",
    description: "Entenda como a Trilink coleta, usa e protege seus dados pessoais em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
    return (
        <div className="container max-w-4xl py-16 px-6 md:py-24">
            <div className="space-y-4 mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Política de Privacidade</h1>
                <p className="text-lg text-muted-foreground">
                    Em conformidade com a Lei Geral de Proteção de Dados (LGPD)
                </p>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-justify leading-relaxed">
                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">1. Introdução</h2>
                    <p className="text-muted-foreground">
                        A <strong>Trilink Software</strong> valoriza a sua privacidade. Esta política descreve como coletamos, usamos, armazenamos e protegemos as informações pessoais dos usuários do nosso Portal do Cliente, em estrita conformidade com a Lei nº 13.709/2018 (LGPD).
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">2. Coleta de Dados</h2>
                    <p className="text-muted-foreground mb-4">
                        Coletamos apenas os dados estritamente necessários para a prestação de nossos serviços de suporte e manutenção de software:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                        <li><strong>Dados de Identificação:</strong> Nome completo, e-mail corporativo e telefone.</li>
                        <li><strong>Dados da Empresa:</strong> Razão social, CNPJ e endereço comercial.</li>
                        <li><strong>Logs de Acesso:</strong> Endereço IP, navegador utilizado e data/hora de acesso, para fins de auditoria e segurança.</li>
                        <li><strong>Conteúdo de Suporte:</strong> Informações fornecidas voluntariamente na abertura de chamados (prints, descrições de erros).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">3. Uso das Informações</h2>
                    <p className="text-muted-foreground">
                        Utilizamos seus dados para:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                        <li>Autenticar seu acesso ao Portal do Cliente.</li>
                        <li>Prestar suporte técnico e responder a solicitações.</li>
                        <li>Enviar notificações importantes sobre atualizações do sistema ou manutenção (Release Notes).</li>
                        <li>Melhorar a segurança e performance da plataforma.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">4. Compartilhamento de Dados</h2>
                    <p className="text-muted-foreground">
                        A Trilink Software <strong>não vende</strong> seus dados pessoais. O compartilhamento ocorre apenas com parceiros estritamente necessários para a operação do serviço (ex: provedor de hospedagem em nuvem, sistema de tickets Zammad), sob contratos de confidencialidade, ou quando exigido por lei.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">5. Segurança</h2>
                    <p className="text-muted-foreground">
                        Adotamos medidas técnicas e administrativas robustas para proteger seus dados contra acessos não autorizados, perda ou alteração. Utilizamos criptografia (SSL/TLS) em todas as comunicações e armazenamos senhas de forma criptografada (Hash).
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">6. Seus Direitos (LGPD)</h2>
                    <p className="text-muted-foreground mb-2">
                        Você tem o direito de solicitar:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                        <li>Confirmação da existência de tratamento de dados.</li>
                        <li>Acesso aos dados.</li>
                        <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                        <li>Revogação do consentimento (quando aplicável).</li>
                    </ul>
                    <p className="text-muted-foreground mt-4">
                        Para exercer seus direitos, entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail: <a href="mailto:trilinksuporte@gmail.com" className="text-primary hover:underline">trilinksuporte@gmail.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}