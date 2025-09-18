import { useEffect, useMemo, useState } from "react";

// fallback data (caso /public/changelog.json não exista)
const fallbackData = {
  meta: {
    project: "AureoArtes PWA",
    repoUrl: "https://github.com/aureoartes/aureoartes-pwa",
    siteUrl: "https://app.aureoartes.com.br",
    updatedAt: "2025-09-18",
  },
  versions: [
    {
      version: "v2.0.0",
      status: "Planned",
      date: null,
      highlights: ["Seleção de layouts do placar", "Autenticação Google", "Planos + checkout"],
    },
    {
      version: "v1.2.0",
      status: "Unreleased",
      date: null,
      highlights: ["Guia Partidas no TimeDetalhes", "Home exibir última partida encerrada"],
    },
    {
      version: "v1.1.0",
      status: "Released",
      date: "2025-09-18",
      highlights: ["Ajustes finos de UI/UX", "Otimizações em mobile"],
    },
    {
      version: "v1.0.0",
      status: "Released",
      date: "2025-??-??",
      highlights: ["MVP inicial com times, campeonatos e placar"],
    },
  ],
};

const statusStyle = {
  Released: "bg-green-100 text-green-800 border-green-200",
  Unreleased: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Planned: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function ChangelogPage() {
  const [data, setData] = useState(fallbackData);

  useEffect(() => {
    fetch("/changelog.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setData(json))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold">{data.meta.project} — Changelog</h1>
        <p className="text-gray-600 text-sm">
          Última atualização: {data.meta.updatedAt}
        </p>
        <p className="mt-2 text-sm">
          <a
            href={data.meta.siteUrl}
            className="underline text-blue-600"
            target="_blank"
          >
            Acessar aplicação
          </a>{" "}
          •{" "}
          <a
            href={data.meta.repoUrl}
            className="underline text-blue-600"
            target="_blank"
          >
            Repositório
          </a>
        </p>
      </header>

      <div className="space-y-6">
        {data.versions.map((v, i) => (
          <div
            key={i}
            id={v.version}
            className="border rounded-lg p-5 shadow-sm bg-white"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{v.version}</h2>
              <span
                className={`px-2 py-1 text-xs rounded border ${statusStyle[v.status]}`}
              >
                {v.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Data: {v.date ? v.date : "TBA"}
            </p>
            {v.highlights?.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-1">
                {v.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
