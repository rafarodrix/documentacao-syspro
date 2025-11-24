import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando o Seed do Banco de Dados...')

  // 1. Criar/Atualizar Empresa
  const trilink = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      razaoSocial: 'Trilink Software',
      nomeFantasia: 'Trilink',
      cnpj: '00.000.000/0001-00',
      emailContato: 'rafaelrodrix@icloud.com',
      status: 'ACTIVE',
    },
  })

  // 2. Criar/Atualizar Super Admin
  const adminEmail = 'rafaelrodrix@icloud.com'
  const passwordHash = await hash('123456', 10); // Gera o hash novo
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    
    // --- CORREÇÃO AQUI: FORÇAR A ATUALIZAÇÃO DA SENHA ---
    update: {
      role: 'DEVELOPER',
      isActive: true,
      password: passwordHash, // <--- DESCOMENTADO! Isso garante que a senha 123456 seja gravada.
    },
    
    create: {
      email: adminEmail,
      name: 'Super Admin',
      role: 'DEVELOPER',
      emailVerified: true,
      isActive: true,
      password: passwordHash,
      companies: {
        connect: { id: trilink.id }
      }
    },
  })

  console.log(`✅ Usuário atualizado com sucesso.`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })