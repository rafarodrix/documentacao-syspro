"use client"

import { useState } from "react"
import { toast } from "sonner"
import { UseFormSetValue } from "react-hook-form"

interface CepResponse {
    cep: string
    state: string
    city: string
    neighborhood: string
    street: string
    service: string
}

export function useAddressLookup(setValue: UseFormSetValue<any>) {
    const [isLoadingCep, setIsLoadingCep] = useState(false)

    const handleCepChange = async (value: string) => {
        // 1. Limpeza e Formatação Visual (00000-000)
        const cleanCep = value.replace(/\D/g, "")
        const formatted = cleanCep
            .replace(/^(\d{5})(\d)/, "$1-$2")
            .substring(0, 9)

        // Atualiza o campo CEP usando o caminho aninhado conforme o Schema
        setValue("address.cep", formatted, { shouldValidate: true })

        // 2. Dispara a busca apenas quando atingir 8 dígitos numéricos
        if (cleanCep.length === 8) {
            setIsLoadingCep(true)
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`)

                if (!response.ok) {
                    throw new Error("CEP não encontrado")
                }

                const data: CepResponse = await response.json()

                // 3. Preenchimento Automático (Sincronizado com addressSchema)
                // Usamos o prefixo 'address.' para mapear corretamente para a tabela separada
                setValue("address.logradouro", data.street || "", { shouldValidate: true })
                setValue("address.bairro", data.neighborhood || "", { shouldValidate: true })
                setValue("address.cidade", data.city || "", { shouldValidate: true })
                setValue("address.estado", data.state || "", { shouldValidate: true })

                // Foca no campo de número para melhorar a UX
                setTimeout(() => {
                    const numberInput = document.getElementById("numero-input")
                    if (numberInput) numberInput.focus()
                }, 100)

                toast.success("Endereço localizado!")
            } catch (error) {
                toast.error("CEP não encontrado ou serviço indisponível.")

                // Opcional: Limpa os campos em caso de erro para evitar dados inconsistentes
                setValue("address.logradouro", "")
                setValue("address.bairro", "")
                setValue("address.cidade", "")
                setValue("address.estado", "")
            } finally {
                setIsLoadingCep(false)
            }
        }
    }

    return {
        isLoadingCep,
        handleCepChange
    }
}