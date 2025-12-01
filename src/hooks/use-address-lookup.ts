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
}

export function useAddressLookup(setValue: UseFormSetValue<any>) {
    const [isLoadingCep, setIsLoadingCep] = useState(false)

    const handleCepChange = async (value: string) => {
        // 1. Formata visualmente (00000-000)
        const formatted = value
            .replace(/\D/g, "")
            .replace(/^(\d{5})(\d)/, "$1-$2")
            .substr(0, 9)

        // Atualiza o campo visualmente
        setValue("cep", formatted)

        // 2. Se tiver o tamanho correto (8 números), busca na API
        const cleanCep = value.replace(/\D/g, "")
        if (cleanCep.length === 8) {
            setIsLoadingCep(true)
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`)

                if (!response.ok) {
                    throw new Error("CEP não encontrado")
                }

                const data: CepResponse = await response.json()

                // 3. Preenche os campos do formulário
                setValue("logradouro", data.street)
                setValue("bairro", data.neighborhood)
                setValue("cidade", data.city)
                setValue("estado", data.state)

                // Foca no número para agilizar
                const numberInput = document.getElementById("numero-input") // Vamos adicionar esse ID no input
                if (numberInput) numberInput.focus()

                toast.success("Endereço encontrado!")
            } catch (error) {
                toast.error("CEP não encontrado ou inválido.")
                // Limpa campos se der erro, opcional
                setValue("logradouro", "")
                setValue("bairro", "")
                setValue("cidade", "")
                setValue("estado", "")
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