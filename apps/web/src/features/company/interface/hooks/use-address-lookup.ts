"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UseFormSetValue } from "react-hook-form";
import type { CreateCompanyInput } from "@dosc-syspro/contracts/company";
import { onlyDigits } from "@/lib/utils";

interface BrasilApiCepResponse {
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
}

interface ViaCepResponse {
  uf?: string;
  localidade?: string;
  bairro?: string;
  logradouro?: string;
  ibge?: string;
  erro?: boolean;
}

const UF_IBGE_CODE: Record<string, string> = {
  RO: "11",
  AC: "12",
  AM: "13",
  RR: "14",
  PA: "15",
  AP: "16",
  TO: "17",
  MA: "21",
  PI: "22",
  CE: "23",
  RN: "24",
  PB: "25",
  PE: "26",
  AL: "27",
  SE: "28",
  BA: "29",
  MG: "31",
  ES: "32",
  RJ: "33",
  SP: "35",
  PR: "41",
  SC: "42",
  RS: "43",
  MS: "50",
  MT: "51",
  GO: "52",
  DF: "53",
};

export function useAddressLookup(setValue: UseFormSetValue<CreateCompanyInput>) {
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const handleCepChange = async (value: string) => {
    const cleanCep = onlyDigits(value);
    const formatted = cleanCep.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);

    setValue("address.cep", formatted, { shouldValidate: true });

    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const [brasilApiResp, viaCepResp] = await Promise.allSettled([
        fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`),
        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`),
      ]);

      let street = "";
      let neighborhood = "";
      let city = "";
      let state = "";
      let codigoIbgeCidade = "";
      let codigoIbgeEstado = "";

      if (brasilApiResp.status === "fulfilled" && brasilApiResp.value.ok) {
        const data: BrasilApiCepResponse = await brasilApiResp.value.json();
        street = data.street || "";
        neighborhood = data.neighborhood || "";
        city = data.city || "";
        state = data.state || "";
      }

      if (viaCepResp.status === "fulfilled" && viaCepResp.value.ok) {
        const viaCep: ViaCepResponse = await viaCepResp.value.json();
        if (!viaCep.erro) {
          street = street || viaCep.logradouro || "";
          neighborhood = neighborhood || viaCep.bairro || "";
          city = city || viaCep.localidade || "";
          state = state || viaCep.uf || "";
          codigoIbgeCidade = viaCep.ibge || "";
          codigoIbgeEstado = viaCep.uf ? UF_IBGE_CODE[viaCep.uf] || "" : "";
        }
      }

      if (!street && !neighborhood && !city && !state) {
        throw new Error("CEP not found");
      }

      setValue("address.logradouro", street, { shouldValidate: true });
      setValue("address.bairro", neighborhood, { shouldValidate: true });
      setValue("address.cidade", city, { shouldValidate: true });
      setValue("address.estado", state, { shouldValidate: true });
      setValue("address.codigoIbgeCidade", codigoIbgeCidade, { shouldValidate: true });
      setValue("address.codigoIbgeEstado", codigoIbgeEstado, { shouldValidate: true });

      setTimeout(() => {
        const numberInput = document.getElementById("numero-input");
        if (numberInput) numberInput.focus();
      }, 100);

      toast.success("Endereco localizado.");
    } catch {
      toast.error("CEP nao encontrado ou servico indisponivel.");
      setValue("address.logradouro", "");
      setValue("address.bairro", "");
      setValue("address.cidade", "");
      setValue("address.estado", "");
      setValue("address.codigoIbgeCidade", "");
      setValue("address.codigoIbgeEstado", "");
    } finally {
      setIsLoadingCep(false);
    }
  };

  return {
    isLoadingCep,
    handleCepChange,
  };
}

