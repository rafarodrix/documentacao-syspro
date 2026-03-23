import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Termos de Uso | Trilink Software",
    description: "Leia atentamente os termos e condições de uso do Portal do Cliente e serviços da Trilink.",
};

export default function TermosPage() {
    return (
        <div className="container max-w-4xl py-16 px-6 md:py-24">
            <div className="space-y-4 mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Termos de Uso</h1>
                <p className="text-lg text-muted-foreground">
                    Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-justify leading-relaxed">
                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">1. Aceitação dos Termos</h2>
                    <p className="text-muted-foreground">
                        Ao acessar e utilizar o Portal do Cliente da <strong>Trilink Software</strong>, você concorda expressamente com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, recomendamos que não utilize nossos serviços digitais. O acesso ao portal é concedido de forma pessoal e intransferível, sendo o usuário responsável pela guarda de suas credenciais.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">2. Serviços Oferecidos</h2>
                    <p className="text-muted-foreground">
                        O Portal Trilink tem como objetivo centralizar o suporte técnico, a documentação do sistema Syspro ERP e o fornecimento de ferramentas fiscais. A Trilink Software se reserva o direito de modificar, suspender ou descontinuar qualquer funcionalidade do portal a qualquer momento, mediante aviso prévio, visando sempre a melhoria contínua da plataforma.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">3. Responsabilidades do Usuário</h2>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                        <li>Manter a confidencialidade de seu login e senha.</li>
                        <li>Não utilizar o portal para fins ilegais ou não autorizados.</li>
                        <li>Garantir a veracidade das informações fornecidas no cadastro e na abertura de chamados.</li>
                        <li>Não tentar violar a segurança do sistema ou realizar engenharia reversa das ferramentas disponibilizadas.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">4. Propriedade Intelectual</h2>
                    <p className="text-muted-foreground">
                        Todo o conteúdo disponibilizado neste portal, incluindo textos, gráficos, logotipos, ícones, manuais e software, é de propriedade exclusiva da Trilink Software ou de seus fornecedores e está protegido pelas leis de direitos autorais e propriedade intelectual do Brasil.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">5. Limitação de Responsabilidade</h2>
                    <p className="text-muted-foreground">
                        A Trilink Software não será responsável por danos indiretos, incidentais ou consequentes decorrentes do uso ou da incapacidade de uso do portal, incluindo, mas não se limitando a, perda de dados ou interrupção de negócios, exceto nos casos previstos em contrato de prestação de serviços (SLA).
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">6. Contato</h2>
                    <p className="text-muted-foreground">
                        Para dúvidas sobre estes termos, entre em contato através do e-mail: <a href="mailto:trilinksuporte@gmail.com" className="text-primary hover:underline">trilinksuporte@gmail.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}