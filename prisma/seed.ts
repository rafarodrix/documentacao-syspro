import { PrismaClient, Role, CompanyStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Iniciando Seed do Super Admin...')

    // 1. Criar a Trilink (Sua empresa SaaS)
    const trilink = await prisma.company.upsert({
        where: { cnpj: '00.000.000/0001-00' },
        update: {},
        create: {
            razaoSocial: 'Trilink Software',
            nomeFantasia: 'Trilink Admin',
            cnpj: '00.000.000/0001-00',
            emailContato: 'rafael@trilink.com.br',
            status: CompanyStatus.ACTIVE,
        },
    })

    // 2. Criar o Usuário Rafael
    const user = await prisma.user.upsert({
        where: { email: 'rafael@trilink.com.br' },
        update: { role: Role.ADMIN },
        create: {
            email: 'rafael@trilink.com.br',
            name: 'Rafael Admin',
            role: Role.ADMIN,
            emailVerified: true,
            isActive: true,
            image: 'https://github.com/shadcn.png',
        },
    })

    // 3. Vincular Rafael à Trilink
    await prisma.membership.upsert({
        where: {
            userId_companyId: { userId: user.id, companyId: trilink.id }
        },
        update: { role: Role.ADMIN },
        create: {
            userId: user.id,
            companyId: trilink.id,
            role: Role.ADMIN
        }
    })

    console.log(`✅ Seed concluído! Admin: ${user.email}`)
    console.log(`⚠️ IMPORTANTE: No primeiro acesso, use "Esqueci minha senha" para definir sua senha, pois o Seed não gera hash do Better Auth.`)
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })