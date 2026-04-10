import { PrismaClient, CompanyStatus } from "@prisma/client";

const prisma = new PrismaClient();

const companies = [
  {
    cnpj: "20355212000107",
    razaoSocial: "A N SUPLEMENTOS NUTRICIONAIS LTDA",
    nomeFantasia: "AMERICAN NUTRITION SUPLEMENTOS NUTRICIONAIS",
  },
  {
    cnpj: "50656074000159",
    razaoSocial: "AB COMERCIAL DE PRODUTOS DE LIMPEZA LTDA",
    nomeFantasia: "UNISHOP - CENTRO DA LIMPEZA SETE LAGOAS",
  },
  {
    cnpj: "50656074000230",
    razaoSocial: "AB COMERCIAL DE PRODUTOS DE LIMPEZA LTDA",
    nomeFantasia: "POLISETE",
  },
  {
    cnpj: "50656074000310",
    razaoSocial: "AB COMERCIAL DE PRODUTOS DE LIMPEZA LTDA",
    nomeFantasia: "UNISHOP CENTRO DA LIMPEZA",
  },
  {
    cnpj: "45610100000178",
    razaoSocial: "ACO - FERRAGENS, FERRAMENTAS & CIA LTDA",
    nomeFantasia: "ACO FERRAGENS, FERRAMENTAS & CIA",
  },
  {
    cnpj: "7124628000148",
    razaoSocial: "AEM COMERCIO DE CONFECCOES LTDA",
    nomeFantasia: "VIDA NOVA CONFECCOES",
  },
  {
    cnpj: "43708651000143",
    razaoSocial: "AGROKASA PET SHOP LTDA",
    nomeFantasia: "AGROKASA",
  },
  {
    cnpj: "27995361000171",
    razaoSocial: "AGROPECUARIA CASA DO PRODUTOR COMERCIO & REPRESENTACAO LTDA",
    nomeFantasia: "CASA DO PRODUTOR",
  },
  {
    cnpj: "52124171000126",
    razaoSocial: "AGROTRATO PRODUTOS AGROPECUARIOS LTDA",
    nomeFantasia: "AGROTRATO PRODUTOS AGROPECUARIOS",
  },
  {
    cnpj: "7044095000194",
    razaoSocial: "AGUIA CONTABIL",
    nomeFantasia: "AGUIA CONTABIL",
  },
  {
    cnpj: "71208516000174",
    razaoSocial: "ALGAR TELECOM S/A",
    nomeFantasia: "CTBC",
  },
  {
    cnpj: "50740595000190",
    razaoSocial: "ALYSSON DOMINGUES AMUY MARQUES",
    nomeFantasia: "CASA DE CARNES DOMINGUES - CONGELADOS",
  },
  {
    cnpj: "33992331000104",
    razaoSocial: "AMANDA CAROLINA CAMARGO DE FREITAS",
    nomeFantasia: "SACOLAO BELA VISTA",
  },
  {
    cnpj: "45548843000165",
    razaoSocial: "ANA CLAUDIA CUNHA FRANCO FERREIRA 09650925694",
    nomeFantasia: "FABRICA PAES 2 CORACOES",
  },
  {
    cnpj: "59814156000159",
    razaoSocial: "ANAS BABY COMERCIO LTDA",
    nomeFantasia: "ANAS BABY",
  },
  {
    cnpj: "11483642000105",
    razaoSocial: "ANDREIA APARECIDA RABELO",
    nomeFantasia: "ALIMENTOS E SERVICOS REIS",
  },
  {
    cnpj: "19797247000109",
    razaoSocial: "ANGELITA M. MENDES EIRELI",
    nomeFantasia: "SAUDE MANIA",
  },
  {
    cnpj: "1887243000156",
    razaoSocial: "APICE - CENTRO EDUCACIONAL LTDA",
    nomeFantasia: "APICE",
  },
  {
    cnpj: "3817524000168",
    razaoSocial: "ARMAZEM DO MOVEL LTDA",
    nomeFantasia: "ARMAZEM DO MOVEL",
  },
  {
    cnpj: "29199694000110",
    razaoSocial: "ARTHUR VINICIUS DE OLIVEIRA 13405185629",
    nomeFantasia: "SAO JOSE ATACADO E VAREJO HORTIFRUTIGRANJEIROS",
  },
  {
    cnpj: "3874879000199",
    razaoSocial: "AUTO MECANICA DJALMA E SERGIO LTDA",
    nomeFantasia: "MECANICA 3 AMIGOS",
  },
  {
    cnpj: "24146724000106",
    razaoSocial: "AUTO MECANICA MARTINS LTDA",
    nomeFantasia: "MECANICA MARTINS",
  },
  {
    cnpj: "26875543000146",
    razaoSocial: "AUTO MECANICA MEGA TRUCK LTDA",
    nomeFantasia: "LUAN MECANICA EM GERAL",
  },
  {
    cnpj: "55076927000105",
    razaoSocial: "AUTO PECAS 26 LTDA",
    nomeFantasia: "AUTO PECAS 26",
  },
  {
    cnpj: "41866139000108",
    razaoSocial: "BARUPE MADEIREIRA E TRANSPORTES LTDA",
    nomeFantasia: "BARUPE TRANSPORTES",
  },
  {
    cnpj: "53460926000126",
    razaoSocial: "BERNARDES & SILVEIRA COMERCIO DE PRODUTOS AGROPECUARIOS",
    nomeFantasia: "CASA DO FAZENDEIRO",
  },
  {
    cnpj: "49697215000100",
    razaoSocial: "BILBOQUE KIDS COMERCIO VAREJISTA LTDA",
    nomeFantasia: "BILBOQUE",
  },
  {
    cnpj: "42624496000114",
    razaoSocial: "BRITO & MATOS LTDA",
    nomeFantasia: "TRIANGULO AGRO",
  },
  {
    cnpj: "28363124000150",
    razaoSocial: "BRUNO RIBEIRO DE PAULA",
    nomeFantasia: "BRUNOCAR",
  },
  {
    cnpj: "58772841000105",
    razaoSocial: "C & A CAETANO E ARAKI LTDA",
    nomeFantasia: "UNISHOP PITANGUI",
  },
  {
    cnpj: "48787381000127",
    razaoSocial: "CARLOS HENRIQUE DOS SANTOS DA SILVA 12773981600",
    nomeFantasia: "DENTAL GUERRA",
  },
  {
    cnpj: "64268006000127",
    razaoSocial: "CASA DE CARNE GALDINO MARTINS LTDA",
    nomeFantasia: "CASA DE CARNES MARAVILHA",
  },
  {
    cnpj: "32988976000100",
    razaoSocial: "CASA DE CARNES DOMINGUES LTDA",
    nomeFantasia: "CASA DE CARNE DOMINGUES",
  },
  {
    cnpj: "61338526000170",
    razaoSocial: "CASA DOS GRAOS LTDA",
    nomeFantasia: "CASA DOS GRAOS - GRAOS QUE MOVEM O AGRO",
  },
  {
    cnpj: "71387856000100",
    razaoSocial: "CENTER-BIKE BICICLETAS LTDA",
    nomeFantasia: "CENTER-BIKE BICICLETAS LTDA",
  },
  {
    cnpj: "14836940000120",
    razaoSocial: "CENTRAL CLEANER LTDA",
    nomeFantasia: "EMPORIO DA LIMPEZA",
  },
  {
    cnpj: "51075334000165",
    razaoSocial: "CHUNXIAN ZHENG",
    nomeFantasia: "TOP VARIEDADES",
  },
  {
    cnpj: "7214345000197",
    razaoSocial: "CIRENE CARMEM NOGUEIRA SILVA",
    nomeFantasia: "ACAO CHAVEIROS E FECHADURAS",
  },
  {
    cnpj: "36620005000164",
    razaoSocial: "CLEIBER MARCELINO DA SILVA 00188171657",
    nomeFantasia: "SHOW BOLOS",
  },
  {
    cnpj: "5850539000153",
    razaoSocial: "COMERCIAL DE MATERIAIS RECICLAVEIS REIS LTDA",
    nomeFantasia: "SUCATAO 46",
  },
  {
    cnpj: "58685262000117",
    razaoSocial: "COMERCIAL MELO & FREITAS LTDA",
    nomeFantasia: "PORTAL AUTO CENTER",
  },
  {
    cnpj: "19189788000154",
    razaoSocial: "COMERCIAL MULTI OVOS LTDA",
    nomeFantasia: "MULTI OVOS",
  },
  {
    cnpj: "14734026000178",
    razaoSocial: "COMERCIO DE ALIMENTOS SOUZA EIRELI ME",
    nomeFantasia: "COMERCIAL MADRI DOCES",
  },
  {
    cnpj: "71432199000175",
    razaoSocial: "CONFECCOES A & C LTDA - ME",
    nomeFantasia: "TERRASHOES",
  },
  {
    cnpj: "54811712000110",
    razaoSocial: "DANIELA PACHECO MENEZES",
    nomeFantasia: "COMERCIAL ALVORADA",
  },
  {
    cnpj: "57013210000131",
    razaoSocial: "DEPOSITO DE AREIA IRMAOS BERGAMO LTDA",
    nomeFantasia: "DEPOSITO DE AREIA IRMAOS BERGAMO",
  },
  {
    cnpj: "14162040000144",
    razaoSocial: "DEPOSITO DE GAS TIJUCANO EIRELI",
    nomeFantasia: "GAS TIJUCANO",
  },
  {
    cnpj: "48717898000140",
    razaoSocial: "DIAS GOMIDE PRESTADORA DE SERVICOS LTDA",
    nomeFantasia: "DIAS GOMIDE PRESTADORA DE SERVICOS",
  },
  {
    cnpj: "40749790000127",
    razaoSocial: "EDMILSON ALMEIDA DE SOUZA",
    nomeFantasia: "AUTO PECAS FERRARI",
  },
  {
    cnpj: "3740884622",
    razaoSocial: "EDSON VIEIRA FLOR",
    nomeFantasia: "EDSON",
  },
  {
    cnpj: "40071295000101",
    razaoSocial: "EDUARDA VELASCO ALVES",
    nomeFantasia: "JEROMAO CONVENIENCIA",
  },
  {
    cnpj: "4166518607",
    razaoSocial: "EDUARDO SILVA GOMES",
    nomeFantasia: "EDUARDO",
  },
  {
    cnpj: "35590152000176",
    razaoSocial: "EMPORIO DA LIMPEZA ITUIUTABA LTDA",
    nomeFantasia: "EMPORIO DA LIMPEZA",
  },
  {
    cnpj: "47363032000115",
    razaoSocial: "ESPACO PET'S ITUIUTABA LTDA",
    nomeFantasia: "ESPACO PET'S",
  },
  {
    cnpj: "46920432000111",
    razaoSocial: "ESTANCIA PRODUTOS AGROPECUARIOS LTDA",
    nomeFantasia: "ESTANCIA PRODUTOS AGROPECUARIOS",
  },
  {
    cnpj: "25383551000102",
    razaoSocial: "FABIANO LUIS DE SOUZA 03790677655",
    nomeFantasia: "RADCAR RADIADORES",
  },
  {
    cnpj: "6192825000131",
    razaoSocial: "FARMACIA HOMEOGARVIL EIRELI - EPP",
    nomeFantasia: "FARMACIA HOMEOGARVIL DE MANIPULACAO",
  },
  {
    cnpj: "18127539000171",
    razaoSocial: "FERNANDO LUIS FRANCO",
    nomeFantasia: "IFTM LANCHES",
  },
  {
    cnpj: "25137499000104",
    razaoSocial: "FOTO STUDIO VINTE LTDA",
    nomeFantasia: "FOTO STUDIO MAIA",
  },
  {
    cnpj: "46274334000154",
    razaoSocial: "FRATARI ALIMENTOS LTDA",
    nomeFantasia: "EMPORIO DO POVO",
  },
  {
    cnpj: "46274334000235",
    razaoSocial: "FRATARI ALIMENTOS LTDA",
    nomeFantasia: "EMPORIO DO BREU",
  },
  {
    cnpj: "22243281000146",
    razaoSocial: "FRATARI SERVICOS SOCIAIS LTDA",
    nomeFantasia: "FRATARI",
  },
  {
    cnpj: "29568674000179",
    razaoSocial: "FRUTOS DO BOSQUE SORVETES LTDA",
    nomeFantasia: "FRUTOS DO BOSQUE-SORVETES E ACAI",
  },
  {
    cnpj: "17879739000118",
    razaoSocial: "FW CALCADOS E CONFECCOES LTDA",
    nomeFantasia: "MICHELLY MODAS",
  },
  {
    cnpj: "15222472000166",
    razaoSocial: "GRACIELA MARQUES DA SILVEIRA BERALDO",
    nomeFantasia: "COMERCIAL NOVO",
  },
  {
    cnpj: "55894967000156",
    razaoSocial: "GUILHERME AUTO PECAS LTDA",
    nomeFantasia: "BOZO PECAS",
  },
  {
    cnpj: "8316485000139",
    razaoSocial: "HELENICE MARIA DE SOUZA PAULA E CIA LTDA",
    nomeFantasia: "JAGUAR AUTO PECAS",
  },
  {
    cnpj: "6237816000110",
    razaoSocial: "HELIO PEREIRA LEITE & CIA LTDA",
    nomeFantasia: "HP AUTO PECAS",
  },
  {
    cnpj: "15412449000134",
    razaoSocial: "HOSPITAL VETERINARIO VITRINE DOS ANIMAIS LTDA",
    nomeFantasia: "HOSPITAL VETERINARIO VITRINE DOS ANIMAIS",
  },
  {
    cnpj: "43806615000112",
    razaoSocial: "HT TRANSPORTES ITUIUTABA LTDA",
    nomeFantasia: "HT TRANSPORTES",
  },
  {
    cnpj: "32423674000195",
    razaoSocial: "IDEAGRO LTDA",
    nomeFantasia: "IDEAGRO",
  },
  {
    cnpj: "32423674000276",
    razaoSocial: "IDEAGRO LTDA",
    nomeFantasia: "IDEAGRO - FILIAL",
  },
  {
    cnpj: "20853578000106",
    razaoSocial: "IMPERIAL DIESEL LTDA",
    nomeFantasia: "IMPERIAL DIESEL LTDA",
  },
  {
    cnpj: "36551056000181",
    razaoSocial: "IMPERIO DA CERVEJA LTDA",
    nomeFantasia: "IMPERIO DA CERVEJA 24HS",
  },
  {
    cnpj: "59902362000110",
    razaoSocial: "IONI VIEIRA DOS SANTOS",
    nomeFantasia: "AUT INFORMATICA E VARIEDADES",
  },
  {
    cnpj: "43983244000144",
    razaoSocial: "IPE FERRAGISTA E MATERIAIS ELETRICOS LTDA",
    nomeFantasia: "FERRAGISTA IPE",
  },
  {
    cnpj: "51022207000106",
    razaoSocial: "IRAI JUNIOR LTDA",
    nomeFantasia: "CONVENIENCIA VIEIRA & CANDIDO",
  },
  {
    cnpj: "11116984000197",
    razaoSocial: "J M COMUNICACAO LTDA",
    nomeFantasia: "VIVA COMUNICACAO",
  },
  {
    cnpj: "54085560000115",
    razaoSocial: "JJM COMERCIO, SERVICOS & INDUSTRIA LTDA",
    nomeFantasia: "VIVA COMUNICACAO",
  },
  {
    cnpj: "23807802000103",
    razaoSocial: "JOAO VICTOR MARQUES DE OLIVEIRA",
    nomeFantasia: "CASA DE CARNES VITORIA",
  },
  {
    cnpj: "32375753000178",
    razaoSocial: "JUSSARA QUEIROZ DE SOUZA OLIVEIRA",
    nomeFantasia: "DONNA JU MODAS",
  },
  {
    cnpj: "45292636000192",
    razaoSocial: "LEONARDO LUCIANO LOZINO SILVA",
    nomeFantasia: "RAUL MOTOS",
  },
  {
    cnpj: "22075301000117",
    razaoSocial: "LIDER COMERCIAL DE TINTAS LTDA",
    nomeFantasia: "LIDER TINTAS",
  },
  {
    cnpj: "45878465000188",
    razaoSocial: "LIDER DISTRIBUIDORA CELULARES E INFORMATICA LTDA",
    nomeFantasia: "LIDER DISTRIBUIDORA",
  },
  {
    cnpj: "52767686000144",
    razaoSocial: "LIJIAN ZHENG",
    nomeFantasia: "BABY SHOW",
  },
  {
    cnpj: "40192363000190",
    razaoSocial: "LIOSINGUE LIMA DE OLIVEIRA E SOUZA LTDA",
    nomeFantasia: "ZINGA MIX",
  },
  {
    cnpj: "35774898000130",
    razaoSocial: "LUBFILTRO DISTRIBUIDORA DE LUBRIFICANTES E FILTROS LTDA",
    nomeFantasia: "LUBFILTRO",
  },
  {
    cnpj: "2023496000144",
    razaoSocial: "LUIS ANTONIO SILVA E CIA LTDA",
    nomeFantasia: "AUTO PECAS MUNDIAL",
  },
  {
    cnpj: "47960950002337",
    razaoSocial: "MAGAZINE LUIZA S/A",
    nomeFantasia: "MAGAZINE LUIZA",
  },
  {
    cnpj: "35584550000180",
    razaoSocial: "MARCOS B DE MEDEIROS",
    nomeFantasia: "MINI MERCADO BRASILEIRO",
  },
  {
    cnpj: "57080726000107",
    razaoSocial: "MARIA APARECIDA ALVES SILVA",
    nomeFantasia: "STARTSHOP",
  },
  {
    cnpj: "11967490000116",
    razaoSocial: "MARIA BENIGNA DA SILVA SEVERINO",
    nomeFantasia: "POINT DAS PISCINAS",
  },
  {
    cnpj: "3570593000110",
    razaoSocial: "MARIA DE LOURDES L..PEREIRA CIA LTDA",
    nomeFantasia: "CASA DE CARNES NOVILHAO",
  },
  {
    cnpj: "14159324000181",
    razaoSocial: "MARQUES MARTINS COMERCIO DE PRODUTOS PET LTDA",
    nomeFantasia: "VITRINE DOS ANIMAIS",
  },
  {
    cnpj: "58942557000121",
    razaoSocial: "MB HORTIFRUTI E CASA DE CARNES LTDA",
    nomeFantasia: "MB HORTIFRUTI E CASA DE CARNES",
  },
  {
    cnpj: "10346457000106",
    razaoSocial: "MECMAC REPRESENTACOES LTDA",
    nomeFantasia: "MECMAC",
  },
  {
    cnpj: "62023917000169",
    razaoSocial: "MICHELLE DAIANA COMERCIO DE ROUPAS E ACESSORIOS MULTIMARCAS",
    nomeFantasia: "CDF MULTIMARCAS",
  },
  {
    cnpj: "3568666000139",
    razaoSocial: "MIGUEL DO CARMO DE MOURA 49374109620",
    nomeFantasia: "MIGUEL BALANCAS",
  },
  {
    cnpj: "15499671000116",
    razaoSocial: "MINERACAO NOVA ZELANDIA LTDA",
    nomeFantasia: "MINERACAO NOVA ZELANDIA",
  },
  {
    cnpj: "30270693000101",
    razaoSocial: "MINI MERCADO PONTO CERTO LTDA",
    nomeFantasia: "MINI MERCADO PONTO CERTO",
  },
  {
    cnpj: "37405006000159",
    razaoSocial: "MIRLAN MOREIRA MAIA",
    nomeFantasia: "ATACADAO DOS MOVEIS",
  },
  {
    cnpj: "54845098000107",
    razaoSocial: "ML FILTROS AGROINDUSTRIAL LTDA",
    nomeFantasia: "ML FILTROS",
  },
  {
    cnpj: "49695205000128",
    razaoSocial: "MORAES & TOLEDO SERVICOS LTDA",
    nomeFantasia: "CARAIBA SERVICOS",
  },
  {
    cnpj: "65583602000164",
    razaoSocial: "MOTA SALGADOS E DELICIAS LTDA",
    nomeFantasia: "N H A C FRUTAS E SUCOS",
  },
  {
    cnpj: "13878213000162",
    razaoSocial: "MUNDIAL DISTRIBUIDORA DE AUTO PECAS LTDA",
    nomeFantasia: "MUNDIAL DISTRIBUIDORA",
  },
  {
    cnpj: "15868205000160",
    razaoSocial: "NATHAN ELIAS BERGAMO",
    nomeFantasia: "DISK ENTULHO AREIA BERGAMO",
  },
  {
    cnpj: "6254686000123",
    razaoSocial: "NOGUEIRA MATERIAIS PARA CONSTRUCOES LTDA",
    nomeFantasia: "J NOGUEIRA COMERCIAL",
  },
  {
    cnpj: "3061123000120",
    razaoSocial: "ONILIO BATISTA DA CRUZ EIRELI",
    nomeFantasia: "AUTO DIESEL MINAS",
  },
  {
    cnpj: "14977427000159",
    razaoSocial: "ONORIO E BORGES LTDA",
    nomeFantasia: "STOCK PECAS AUTOMOTIVAS",
  },
  {
    cnpj: "3491872000198",
    razaoSocial: "PAULO VICENTE DO NASCIMENTO",
    nomeFantasia: "GAZ MACEDO E SORVETERIA SABOR PERFEITO",
  },
  {
    cnpj: "52939506000164",
    razaoSocial: "PAULO VICENTE FERREIRA GUIMARAES",
    nomeFantasia: "COMERCIAL CIDADE JARDIM",
  },
  {
    cnpj: "49997928000181",
    razaoSocial: "PEDRO TEODORO JUNIOR",
    nomeFantasia: "GENESIS CAR AUTO CENTER",
  },
  {
    cnpj: "15418651000173",
    razaoSocial: "PET SHOP JUNQUEIRA EIRELI",
    nomeFantasia: "AMIGO PET",
  },
  {
    cnpj: "63060108000190",
    razaoSocial: "POINT DA LIMPEZA E HIGIENIZACAO LTDA",
    nomeFantasia: "POINT DA LIMPEZA",
  },
  {
    cnpj: "18468731000121",
    razaoSocial: "POLYANA VEICULOS LTDA",
    nomeFantasia: "POLYANA VEICULOS",
  },
  {
    cnpj: "5431395000109",
    razaoSocial: "PONTAL QUIMICA INDUSTRIA E COMERCIO LTDA",
    nomeFantasia: "PONTAL QUIMICA",
  },
  {
    cnpj: "45380322000141",
    razaoSocial: "PRADO E SEVERINO LTDA",
    nomeFantasia: "CASA DE BOLOS",
  },
  {
    cnpj: "58222487000137",
    razaoSocial: "PRETABA PRE MOLDADOS ITUIUTABA LTDA",
    nomeFantasia: "PRETABA PRE MOLDADOS",
  },
  {
    cnpj: "19977889000190",
    razaoSocial: "QUENIA APARECIDA ROSA 07249149601",
    nomeFantasia: "MORENA ROSA",
  },
  {
    cnpj: "8841104000130",
    razaoSocial: "RADAR MORAES E ACESSORIOS LTDA",
    nomeFantasia: "RADAR ACESSORIOS",
  },
  {
    cnpj: "57011851000157",
    razaoSocial: "RAMON AUTO CENTER LTDA",
    nomeFantasia: "RAMON AUTO CENTER",
  },
  {
    cnpj: "20489227000150",
    razaoSocial: "RELSON DIAS CAETANO",
    nomeFantasia: "TUDO CONGELADOS",
  },
  {
    cnpj: "18644744000104",
    razaoSocial: "RENATA JULIANA VILARINHO 06452823671",
    nomeFantasia: "MOCA BONITA",
  },
  {
    cnpj: "45216790000185",
    razaoSocial: "RHAYNE VIEIRA GUERRA",
    nomeFantasia: "PX CLUB",
  },
  {
    cnpj: "55391962000100",
    razaoSocial: "RMC COMERCIO LTDA",
    nomeFantasia: "IGARAPE PRODUTOS DE LIMPEZA",
  },
  {
    cnpj: "45134671000183",
    razaoSocial: "RODRIGO HENRIQUE DE ALMEIDA 10746245645",
    nomeFantasia: "FORNO DE OURO",
  },
  {
    cnpj: "2557344000121",
    razaoSocial: "SACOLAO DIAS & VIANA LTDA",
    nomeFantasia: "SACOLAO CASA DE CARNE CLASSE A",
  },
  {
    cnpj: "37813990000197",
    razaoSocial: "SACOLAO FOLHA VERDE LTDA",
    nomeFantasia: "SACOLAO FOLHA VERDE",
  },
  {
    cnpj: "58509342000111",
    razaoSocial: "SANTOS & ALVES COMERCIO E ALIMENTOS LTDA",
    nomeFantasia: "MK LANCHONETE",
  },
  {
    cnpj: "57990042000134",
    razaoSocial: "SOMATECH AGRO LTDA",
    nomeFantasia: "SOMATECH AGRO",
  },
  {
    cnpj: "53461724000107",
    razaoSocial: "SORVETERIA IMPERIAL SANTOS LTDA",
    nomeFantasia: "SORVETERIA FRUTOS DO BOSQUE",
  },
  {
    cnpj: "7312694000141",
    razaoSocial: "SOUSA E QUEIROZ DOIS PECAS ACESS LTDA",
    nomeFantasia: "MULTIPECAS - PECAS E ACESSORIOS II",
  },
  {
    cnpj: "43807317000147",
    razaoSocial: "START CLEANER LTDA",
    nomeFantasia: "START SHOP EMPORIO DA LIMPEZA",
  },
  {
    cnpj: "8756292000107",
    razaoSocial: "SU MANXIA BIJUTERIAS E ACESSORIOS LTDA",
    nomeFantasia: "BIJUTERIA 22",
  },
  {
    cnpj: "27656606000136",
    razaoSocial: "SULAMITA MARQUES DA SILVA",
    nomeFantasia: "GRANDY MAGAZINE",
  },
  {
    cnpj: "47691139000192",
    razaoSocial: "SUPER SACOLAO CLASSE A LTDA",
    nomeFantasia: "SUPER SACOLAO CLASSE A DA ECONOMIA",
  },
  {
    cnpj: "58772841000288",
    razaoSocial: "SUPRA SUPERMERCADO AUTOMOTIVO LTDA",
    nomeFantasia: "SUPRA SUPERMERCADO AUTOMOTIVO PARA DE MINAS",
  },
  {
    cnpj: "58255708000173",
    razaoSocial: "TIKAS STORE BOLSAS E ACESSORIOS LTDA",
    nomeFantasia: "TIKAS STORE",
  },
  {
    cnpj: "61193195000128",
    razaoSocial: "TORRES PRODUTOS DE LIMPEZA LTDA",
    nomeFantasia: "MUNDO DA LIMPEZA",
  },
  {
    cnpj: "1529384000105",
    razaoSocial: "TRANSPORTADORA MOURA LTDA",
    nomeFantasia: "TRANSMOURA CAVACOS",
  },
  {
    cnpj: "26769047000108",
    razaoSocial: "TRILINK TECNOLOGIA LTDA",
    nomeFantasia: "TRILINK SOFTWARES",
  },
  {
    cnpj: "36012225000105",
    razaoSocial: "UELISMAR FERREIRA DA CUNHA 04798144657",
    nomeFantasia: "LANCHES UFC",
  },
  {
    cnpj: "37023890000167",
    razaoSocial: "UNIAO - TERCEIRIZACAO E COMERCIO LTDA",
    nomeFantasia: "HIDRAULICA UNIAO",
  },
  {
    cnpj: "44439000000168",
    razaoSocial: "UNISHOP CAPINOPOLIS LTDA",
    nomeFantasia: "UNISHOP CAPINOPOLIS",
  },
  {
    cnpj: "7711992000104",
    razaoSocial: "VANIA RODRIGUES MARQUES",
    nomeFantasia: "CASA DE CARNES 13 DE MAIO",
  },
  {
    cnpj: "51037579000106",
    razaoSocial: "VILLA RICA EXPRESS GUIMARAES LTDA",
    nomeFantasia: "VILLA RICA CONGELADOS",
  },
  {
    cnpj: "3358669000148",
    razaoSocial: "VITRINE DOS ANIMAIS LTDA",
    nomeFantasia: "VITRINE DOS ANIMAIS",
  },
  {
    cnpj: "3358669000229",
    razaoSocial: "VITRINE DOS ANIMAIS LTDA",
    nomeFantasia: "VITRINE DOS ANIMAIS",
  },
  {
    cnpj: "44176990000199",
    razaoSocial: "VITRINE DOS ANIMAIS PET SHOPPING LTDA",
    nomeFantasia: "VITRINE DOS ANIMAIS",
  },
  {
    cnpj: "23925618000168",
    razaoSocial: "VSZ PRIME SERVICOS APOIO ADMINISTRATIVO LTDA",
    nomeFantasia: "PRIME",
  },
  {
    cnpj: "19651368000148",
    razaoSocial: "WAGNA SUISSA RODRIGUES DA SILVA GUERRA",
    nomeFantasia: "SAUDE & CIA",
  },
  {
    cnpj: "90324943687",
    razaoSocial: "WALTER PEDRO DE BRITO",
    nomeFantasia: "WALTER",
  },
  {
    cnpj: "20415485000191",
    razaoSocial: "WASHINGTON CARLOS SEVERINO",
    nomeFantasia: "CARLINHOS LANCHES",
  },
  {
    cnpj: "33991646000137",
    razaoSocial: "WELLERSON HENRIQUE DE OLIVEIRA 12749606659",
    nomeFantasia: "SACOLAO BELA VISTA",
  },
  {
    cnpj: "64812718000165",
    razaoSocial: "WILLIAM VIEIRA DA SILVA",
    nomeFantasia: "TRIANGULO ASSISTENCIA",
  },
];

const skippedRows = [
  {
    nome: "CENTRO EMPRESARIAL TIJUCANO",
    fantasia: "CENTRO EMPRESARIAL TIJUCANO",
    documento: "0",
    cnpj_normalizado: "0",
    motivo: "CNPJ invalido ou ausente",
  },
  {
    nome: "SIMPLES NACIONAL",
    fantasia: "SIMPLES NACIONAL",
    documento: "0",
    cnpj_normalizado: "0",
    motivo: "CNPJ invalido ou ausente",
  },
];

function sanitizeCnpj(value) {
  return String(value ?? "").replace(/\D/g, "");
}

async function main() {
  console.log("Iniciando seed de empresas...");
  console.log(`Total de empresas carregadas: ${companies.length}`);

  if (skippedRows.length > 0) {
    console.log(`Linhas ignoradas na origem: ${skippedRows.length}`);
    for (const row of skippedRows) {
      console.log(`- Ignorada: ${row.nome ?? "SEM NOME"} | documento=${row.documento ?? "N/A"} | motivo=${row.motivo}`);
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const company of companies) {
    const cnpj = sanitizeCnpj(company.cnpj);

    if (!cnpj || cnpj === "0") {
      skipped++;
      console.log(`- Ignorada: ${company.razaoSocial} | documento vazio/invalido`);
      continue;
    }

    const existing = await prisma.company.findUnique({
      where: { cnpj },
      select: { id: true },
    });

    await prisma.company.upsert({
      where: { cnpj },
      create: {
        cnpj,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia ?? null,
        status: CompanyStatus.ACTIVE,
      },
      update: {
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia ?? null,
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`Seed de empresas finalizado. Criadas: ${created} | Atualizadas: ${updated} | Ignoradas: ${skipped}`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed de empresas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
