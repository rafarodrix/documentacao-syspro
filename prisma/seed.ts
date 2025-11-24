import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs' // Importa o gerador de hash

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando o Seed do Banco de Dados...')

  // 1. Criar a Empresa "Mãe"
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

  console.log(`🏢 Empresa criada: ${trilink.razaoSocial}`)

  // 2. Criar o Super Admin com senha
  const adminEmail = 'rafaelrodrix@icloud.com'
  // Gera o hash para a senha "123456"
  // O número 10 é o "salt rounds" (custo de processamento padrão)
  const passwordHash = await hash('123456', 10); 
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'DEVELOPER',
      // Se quiser resetar a senha sempre que rodar o seed, descomente a linha abaixo:
      // passwordHash: passwordHash 
    },
    create: {
      email: adminEmail,
      name: 'Super Admin',
      role: 'DEVELOPER',
      emailVerified: true,
      isActive: true,
      password: passwordHash, // Salva a senha criptografada
      companies: {
        connect: { id: trilink.id }
      }
    },
  })

  console.log(`👤 Usuário Admin criado: ${adminUser.email}`)
  console.log(`🔑 Senha definida como: 123456`)
  console.log('✅ Seed finalizado com sucesso.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })