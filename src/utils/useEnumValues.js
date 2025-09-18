// src/utils/useEnumValues.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Hook para buscar valores de um ENUM do Postgres/Supabase via RPC.
 * - enumName: ex. "public.usuario_origem_aquisicao"
 * Retorna: { values: string[], labels: Record<string,string>, loading, error }
 */
export function useEnumValues(enumName = "") {
  const [values, setValues] = useState([]);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallbacks específicos por enum (caso o RPC falhe)
  const FALLBACKS = {
    "public.usuario_origem_aquisicao": [
      "organico",
      "instagram",
      "amazon",
      "shopee",
      "mercadolivre",
      "indicacao",
      "google",
      "youtube",
      "tiktok",
      "site",
      "outro",
    ],
  };

  // Labels amigáveis por enum (overrides opcionais)
  const LABEL_OVERRIDES = {
    "public.usuario_origem_aquisicao": {
      organico: "Orgânico",
      instagram: "Instagram",
      amazon: "Amazon",
      shopee: "Shopee",
      mercadolivre: "Mercado Livre",
      indicacao: "Indicação",
      google: "Google",
      youtube: "YouTube",
      tiktok: "TikTok",
      site: "Site",
      outro: "Outro",
    },
  };

  function defaultLabelize(v) {
    // fallback genérico: separa palavras, capitaliza primeira letra.
    // (não trata acentos; por isso mantemos overrides acima)
    return v
      .replaceAll("_", " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/(^|\\s)\\S/g, (t) => t.toUpperCase());
  }

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);

      // 1) tenta via RPC
      const { data, error } = await supabase.rpc("enum_values", { p_enum: enumName });

      if (!alive) return;

      if (!error && Array.isArray(data) && data.length) {
        const vals = data.map((r) => r.value);
        setValues(vals);
        const overrides = LABEL_OVERRIDES[enumName] || {};
        const labs = {};
        for (const v of vals) labs[v] = overrides[v] ?? defaultLabelize(v);
        setLabels(labs);
        setLoading(false);
        return;
      }

      // 2) fallback local (se existir)
      const fallback = FALLBACKS[enumName] || [];
      if (fallback.length) {
        setValues(fallback);
        const overrides = LABEL_OVERRIDES[enumName] || {};
        const labs = {};
        for (const v of fallback) labs[v] = overrides[v] ?? defaultLabelize(v);
        setLabels(labs);
      } else {
        setValues([]);
        setLabels({});
      }

      setError(error || null);
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [enumName]);

  return { values, labels, loading, error };
}
