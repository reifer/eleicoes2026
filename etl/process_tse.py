#!/usr/bin/env python3
"""Build the static electoral datamart from TSE CSV inputs or explicit demo data.

Production inputs are section-level CSVs for both rounds, a section-level
attendance CSV for both rounds, and a second-round BU CSV containing
``DH_GERACAO``. Input headers follow the TSE naming convention; aliases for
the fields used by the pipeline are accepted. The 17h metric treats
``DH_GERACAO``'s local clock time as a proxy for section closure, as specified
by the project architecture.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import unicodedata
from datetime import datetime, time, timezone
from pathlib import Path
from typing import Any, Iterable

import pandas as pd


LOGGER = logging.getLogger("process_tse")
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RAW = ROOT / "etl" / "raw"
DEFAULT_OUTPUT = ROOT / "public" / "data"
SECTION_KEYS = ["sg_uf", "cd_municipio", "nr_zona", "nr_secao"]
MUNICIPAL_KEYS = ["sg_uf", "cd_municipio"]
UF_NAMES = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal",
    "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão",
    "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
    "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco",
    "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima",
    "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
    "TO": "Tocantins",
}

VOTE_ALIASES = {
    "sg_uf": ("SG_UF",),
    "cd_municipio": ("CD_MUNICIPIO", "CD_MUN"),
    "nm_municipio": ("NM_MUNICIPIO", "NOME_MUNICIPIO"),
    "nr_zona": ("NR_ZONA",),
    "nr_secao": ("NR_SECAO",),
    "nr_turno": ("NR_TURNO",),
    "nr_votavel": ("NR_VOTAVEL",),
    "nm_votavel": ("NM_VOTAVEL", "NM_CANDIDATO", "DS_VOTAVEL"),
    "qt_votos": ("QT_VOTOS",),
    "cd_cargo": ("CD_CARGO",),
    "ds_cargo": ("DS_CARGO", "NM_CARGO"),
}
ATTENDANCE_ALIASES = {
    "sg_uf": ("SG_UF",),
    "cd_municipio": ("CD_MUNICIPIO", "CD_MUN"),
    "nr_zona": ("NR_ZONA",),
    "nr_secao": ("NR_SECAO",),
    "nr_turno": ("NR_TURNO",),
    "qt_aptos": ("QT_APTOS", "QT_ELEITORES_APTOS"),
    "qt_abstencao": ("QT_ABSTENCOES", "QT_ABSTENCAO"),
}
BU_ALIASES = {
    "sg_uf": ("SG_UF",),
    "cd_municipio": ("CD_MUNICIPIO", "CD_MUN"),
    "nr_zona": ("NR_ZONA",),
    "nr_secao": ("NR_SECAO",),
    "dh_geracao": ("DH_GERACAO",),
}
VOTE_METRICS = ("lula", "bolsonaro", "demais", "brancos", "nulos")
TURN_METRICS = ("aptos", "validos", *VOTE_METRICS, "abstencao")


class EtlError(Exception):
    """An input or data-contract error that should stop ETL generation."""


def normalize_header(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", str(value))
    return "".join(char for char in decomposed if not unicodedata.combining(char)).strip().upper()


def _column_map(columns: Iterable[str], aliases: dict[str, tuple[str, ...]], required: set[str]) -> dict[str, str]:
    available = {normalize_header(column): column for column in columns}
    mapped: dict[str, str] = {}
    for canonical, candidates in aliases.items():
        for candidate in candidates:
            if normalize_header(candidate) in available:
                mapped[canonical] = available[normalize_header(candidate)]
                break
    missing = sorted(required - mapped.keys())
    if missing:
        raise EtlError(f"Colunas obrigatórias ausentes no CSV: {', '.join(missing)}")
    return mapped


def _csv_chunks(
    path: Path,
    delimiter: str,
    encoding: str,
    chunksize: int = 250_000,
) -> Iterable[pd.DataFrame]:
    if not path.is_file():
        raise EtlError(f"Arquivo de entrada não encontrado: {path}")
    try:
        with pd.read_csv(
                path,
                sep=delimiter,
                dtype=str,
                encoding=encoding,
                chunksize=chunksize,
                keep_default_na=False,
        ) as reader:
            yield from reader
    except (OSError, pd.errors.ParserError, UnicodeError) as exc:
        raise EtlError(f"Não foi possível abrir CSV {path}: {exc}") from exc


def _normalized_chunk(chunk: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    return chunk.rename(columns={source: target for target, source in mapping.items()})[list(mapping)]


def _clean_keys(frame: pd.DataFrame, source: Path) -> pd.DataFrame:
    for column in SECTION_KEYS:
        frame[column] = frame[column].astype("string").str.strip()
        if frame[column].isna().any() or frame[column].eq("").any():
            raise EtlError(f"Há identificadores vazios em {column} no arquivo {source}")
    frame["sg_uf"] = frame["sg_uf"].str.upper()
    invalid_ufs = sorted(set(frame["sg_uf"]) - set(UF_NAMES))
    if invalid_ufs:
        raise EtlError(f"Siglas de UF inválidas em {source}: {', '.join(invalid_ufs)}")
    return frame


def _numeric(series: pd.Series, label: str, source: Path) -> pd.Series:
    values = pd.to_numeric(series.str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
    if values.isna().any() or (values < 0).any():
        raise EtlError(f"Valores ausentes, inválidos ou negativos em {label} no arquivo {source}")
    return values.astype("int64")


def _turn_filter(frame: pd.DataFrame, expected_turn: int, source: Path) -> pd.DataFrame:
    turns = pd.to_numeric(frame["nr_turno"], errors="coerce")
    if turns.isna().any():
        raise EtlError(f"NR_TURNO contém valores inválidos em {source}")
    return frame.loc[turns.eq(expected_turn)].copy()


def _is_presidential(frame: pd.DataFrame, mapping: dict[str, str], source: Path) -> pd.DataFrame:
    if "ds_cargo" in mapping:
        cargo = frame["ds_cargo"].map(normalize_header)
        result = frame.loc[cargo.str.contains("PRESIDENTE", na=False)].copy()
    elif "cd_cargo" in mapping:
        cargo_code = pd.to_numeric(frame["cd_cargo"], errors="coerce")
        result = frame.loc[cargo_code.eq(1)].copy()
    else:
        raise EtlError(
            f"{source} precisa identificar o cargo presidencial por DS_CARGO ou CD_CARGO"
        )
    if result.empty:
        raise EtlError(f"Nenhum registro para o cargo de Presidente encontrado em {source}")
    return result


def _vote_category(code: str, name: str) -> str:
    normalized_name = normalize_header(name)
    normalized_code = str(code).strip()
    if normalized_code == "95" or "BRANCO" in normalized_name:
        return "brancos"
    if normalized_code == "96" or "NULO" in normalized_name:
        return "nulos"
    if normalized_code == "13" or normalized_name == "LULA" or normalized_name.startswith("LULA "):
        return "lula"
    if normalized_code == "22" or "BOLSONARO" in normalized_name:
        return "bolsonaro"
    return "demais"


def read_votes(path: Path, expected_turn: int, delimiter: str, encoding: str) -> pd.DataFrame:
    """Read TSE voting-by-section rows and return candidate metrics per section."""
    required = {
        "sg_uf", "cd_municipio", "nm_municipio", "nr_zona", "nr_secao",
        "nr_turno", "nr_votavel", "nm_votavel", "qt_votos",
    }
    aggregated_chunks = []
    mapping: dict[str, str] | None = None
    for raw_chunk in _csv_chunks(path, delimiter, encoding):
        if mapping is None:
            mapping = _column_map(raw_chunk.columns, VOTE_ALIASES, required)
        chunk = _normalized_chunk(raw_chunk, mapping)
        chunk = _turn_filter(chunk, expected_turn, path)
        if chunk.empty:
            continue
        chunk = _is_presidential(chunk, mapping, path)
        chunk = _clean_keys(chunk, path)
        chunk["qt_votos"] = _numeric(chunk["qt_votos"], "QT_VOTOS", path)
        chunk["nm_municipio"] = chunk["nm_municipio"].astype("string").str.strip()
        chunk["categoria"] = [
            _vote_category(code, name)
            for code, name in zip(chunk["nr_votavel"], chunk["nm_votavel"])
        ]
        grouped = (
            chunk.pivot_table(
                index=SECTION_KEYS + ["nm_municipio"],
                columns="categoria",
                values="qt_votos",
                aggfunc="sum",
                fill_value=0,
            )
            .reset_index()
        )
        aggregated_chunks.append(grouped)

    if not aggregated_chunks:
        raise EtlError(f"Nenhum registro processável em {path}")
    sections = pd.concat(aggregated_chunks, ignore_index=True)
    sections = sections.groupby(SECTION_KEYS, as_index=False).agg(
        nm_municipio=("nm_municipio", "first"),
        **{metric: (metric, "sum") for metric in VOTE_METRICS if metric in sections.columns},
    )
    for metric in VOTE_METRICS:
        if metric not in sections:
            sections[metric] = 0
    sections["validos"] = sections[["lula", "bolsonaro", "demais"]].sum(axis=1)
    return sections[SECTION_KEYS + ["nm_municipio", *VOTE_METRICS, "validos"]]


def read_attendance(path: Path, expected_turn: int, delimiter: str, encoding: str) -> pd.DataFrame:
    """Read section-level turnout counts and aggregate them by municipality."""
    required = set(ATTENDANCE_ALIASES)
    chunks = []
    mapping: dict[str, str] | None = None
    for raw_chunk in _csv_chunks(path, delimiter, encoding):
        if mapping is None:
            mapping = _column_map(raw_chunk.columns, ATTENDANCE_ALIASES, required)
        chunk = _normalized_chunk(raw_chunk, mapping)
        chunk = _turn_filter(chunk, expected_turn, path)
        if chunk.empty:
            continue
        chunk = _clean_keys(chunk, path)
        for column in ("qt_aptos", "qt_abstencao"):
            chunk[column] = _numeric(chunk[column], column, path)
        chunks.append(chunk[SECTION_KEYS + ["qt_aptos", "qt_abstencao"]])
    if not chunks:
        raise EtlError(f"Nenhum registro processável em {path}")
    attendance = pd.concat(chunks, ignore_index=True)
    duplicates = attendance.duplicated(SECTION_KEYS, keep=False)
    if duplicates.any():
        examples = attendance.loc[duplicates, SECTION_KEYS].head(3).to_dict("records")
        raise EtlError(f"Mais de um registro de comparecimento por seção em {path}: {examples}")
    return (
        attendance.groupby(MUNICIPAL_KEYS, as_index=False)[["qt_aptos", "qt_abstencao"]]
        .sum()
        .rename(columns={"qt_aptos": "aptos", "qt_abstencao": "abstencao"})
    )


def _parse_local_time(value: str, source: Path) -> time:
    text = str(value).strip()
    match = re.search(r"(?<!\d)(\d{1,2}):(\d{2}):(\d{2})(?!\d)", text)
    if not match:
        raise EtlError(f"DH_GERACAO inválido em {source}: {value!r}")
    try:
        return time(*(int(part) for part in match.groups()))
    except ValueError as exc:
        raise EtlError(f"DH_GERACAO inválido em {source}: {value!r}") from exc


def read_bulletins(path: Path, delimiter: str, encoding: str) -> pd.DataFrame:
    """Read one generation time per second-round voting section."""
    required = set(BU_ALIASES)
    chunks = []
    mapping: dict[str, str] | None = None
    for raw_chunk in _csv_chunks(path, delimiter, encoding):
        if mapping is None:
            mapping = _column_map(raw_chunk.columns, BU_ALIASES, required)
        chunk = _normalized_chunk(raw_chunk, mapping)
        chunk = _clean_keys(chunk, path)
        chunk["dh_geracao"] = chunk["dh_geracao"].map(lambda value: _parse_local_time(value, path))
        chunks.append(chunk[SECTION_KEYS + ["dh_geracao"]])
    if not chunks:
        raise EtlError(f"Nenhum registro processável em {path}")
    bulletins = pd.concat(chunks, ignore_index=True)
    duplicates = bulletins.duplicated(SECTION_KEYS, keep=False)
    if duplicates.any():
        examples = bulletins.loc[duplicates, SECTION_KEYS].head(3).to_dict("records")
        raise EtlError(f"Mais de um boletim por seção em {path}: {examples}")
    return bulletins


def _with_turn_metrics(votes: pd.DataFrame, attendance: pd.DataFrame, turn: int) -> pd.DataFrame:
    vote_keys = set(map(tuple, votes[MUNICIPAL_KEYS].astype(str).to_numpy()))
    attendance_keys = set(map(tuple, attendance[MUNICIPAL_KEYS].astype(str).to_numpy()))
    missing = sorted(vote_keys - attendance_keys)
    unexpected = sorted(attendance_keys - vote_keys)
    if missing or unexpected:
        raise EtlError(
            f"Municípios de votação e comparecimento não coincidem no {turn}º turno "
            f"(sem comparecimento: {missing[:5]}; sem votação: {unexpected[:5]})"
        )
    metrics = votes.merge(attendance, on=MUNICIPAL_KEYS, how="left", validate="one_to_one")
    if metrics[["aptos", "abstencao"]].isna().any().any():
        missing = metrics.loc[metrics["aptos"].isna(), MUNICIPAL_KEYS].to_dict("records")
        raise EtlError(f"Dados de aptos/abstenção ausentes no {turn}º turno para municípios: {missing[:5]}")
    metrics["turno"] = turn
    return metrics


def _winner(row: pd.Series, turn: int) -> str | None:
    lula = int(row[f"lula_t{turn}"])
    bolsonaro = int(row[f"bolsonaro_t{turn}"])
    if lula == bolsonaro:
        return None
    return "LULA" if lula > bolsonaro else "BOLSONARO"


def _integer_metrics(row: pd.Series, suffix: str) -> dict[str, int]:
    return {
        metric: int(row[f"{metric}_{suffix}"])
        for metric in TURN_METRICS
    }


def _pos17_metrics(rows: pd.DataFrame, total_sections: int) -> dict[str, int]:
    post = rows.loc[rows["pos_17h"]]
    return {
        "secoes_total": int(total_sections),
        "secoes_pos_17h": int(post[SECTION_KEYS].drop_duplicates().shape[0]),
        "votos_lula_pos_17h": int(post["lula"].sum()),
        "votos_bolsonaro_pos_17h": int(post["bolsonaro"].sum()),
        "brancos_pos_17h": int(post["brancos"].sum()),
        "nulos_pos_17h": int(post["nulos"].sum()),
    }


def build_outputs(
    votes_t1: pd.DataFrame,
    votes_t2: pd.DataFrame,
    attendance_t1: pd.DataFrame,
    attendance_t2: pd.DataFrame,
    bulletins: pd.DataFrame,
    data_source: str,
    generated_at: str | None = None,
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Build national and state payloads from already-normalized section data."""
    second = votes_t2.merge(bulletins, on=SECTION_KEYS, how="left", validate="one_to_one")
    if second["dh_geracao"].isna().any():
        missing = second.loc[second["dh_geracao"].isna(), SECTION_KEYS].head(5).to_dict("records")
        raise EtlError(f"Boletins sem correspondência para seções do 2º turno: {missing}")
    second["pos_17h"] = second["dh_geracao"].map(lambda value: value > time(17, 0, 0))

    first_municipal = votes_t1.groupby(MUNICIPAL_KEYS, as_index=False)[list(VOTE_METRICS) + ["validos"]].sum()
    second_municipal = votes_t2.groupby(MUNICIPAL_KEYS, as_index=False)[list(VOTE_METRICS) + ["validos"]].sum()
    first_municipal = _with_turn_metrics(first_municipal, attendance_t1, 1)
    second_municipal = _with_turn_metrics(second_municipal, attendance_t2, 2)
    names = pd.concat(
        [votes_t1[MUNICIPAL_KEYS + ["nm_municipio"]], votes_t2[MUNICIPAL_KEYS + ["nm_municipio"]]],
        ignore_index=True,
    ).drop_duplicates(MUNICIPAL_KEYS, keep="last")

    t1_columns = {metric: f"{metric}_t1" for metric in TURN_METRICS}
    t2_columns = {metric: f"{metric}_t2" for metric in TURN_METRICS}
    first_municipal = first_municipal.rename(columns=t1_columns)
    second_municipal = second_municipal.rename(columns=t2_columns)
    combined = first_municipal.merge(
        second_municipal,
        on=MUNICIPAL_KEYS,
        how="outer",
        validate="one_to_one",
    ).merge(names, on=MUNICIPAL_KEYS, how="left", validate="one_to_one")
    for column in [*t1_columns.values(), *t2_columns.values()]:
        combined[column] = combined[column].fillna(0).astype("int64")
    combined["nm_municipio"] = combined["nm_municipio"].fillna(combined["cd_municipio"])

    per_municipality_post = {
        (str(uf), str(code)): _pos17_metrics(group, len(group))
        for (uf, code), group in second.groupby(MUNICIPAL_KEYS, sort=True)
    }
    national_sections = second[SECTION_KEYS].drop_duplicates().shape[0]
    national_post = _pos17_metrics(second, national_sections)

    state_payloads: dict[str, dict[str, Any]] = {}
    for uf, state_rows in combined.groupby("sg_uf", sort=True):
        state_name = UF_NAMES[str(uf)]
        municipality_payloads = []
        flips = []
        for _, row in state_rows.sort_values("nm_municipio").iterrows():
            t1 = _integer_metrics(row, "t1")
            t2 = _integer_metrics(row, "t2")
            winner1 = _winner(row, 1)
            winner2 = _winner(row, 2)
            flipped = winner1 is not None and winner2 is not None and winner1 != winner2
            margin = abs(t2["lula"] - t2["bolsonaro"])
            if flipped:
                flips.append({
                    "cd_municipio": str(row["cd_municipio"]),
                    "nome_municipio": str(row["nm_municipio"]),
                    "t1_vencedor": winner1,
                    "t2_vencedor": winner2,
                    "diferenca_votos": margin,
                })
            post = per_municipality_post.get(
                (str(uf), str(row["cd_municipio"])),
                {
                    "secoes_total": 0, "secoes_pos_17h": 0, "votos_lula_pos_17h": 0,
                    "votos_bolsonaro_pos_17h": 0, "brancos_pos_17h": 0, "nulos_pos_17h": 0,
                },
            )
            municipality_payloads.append({
                "cd_mun": str(row["cd_municipio"]),
                "nome": str(row["nm_municipio"]),
                "flipped": flipped,
                "t1": t1,
                "t2": t2,
                "pos_17h": {
                    "secoes_totais": post["secoes_total"],
                    "secoes_pos_17h": post["secoes_pos_17h"],
                    "votos_lula": post["votos_lula_pos_17h"],
                    "votos_bolsonaro": post["votos_bolsonaro_pos_17h"],
                },
            })

        state_municipal = state_rows
        state_totals = {}
        for turn in (1, 2):
            totals = {
                metric: int(state_municipal[f"{metric}_t{turn}"].sum())
                for metric in TURN_METRICS
            }
            state_totals[f"t{turn}"] = totals
        state_post_rows = second.loc[second["sg_uf"].eq(uf)]
        state_pos17 = _pos17_metrics(
            state_post_rows,
            state_post_rows[SECTION_KEYS].drop_duplicates().shape[0],
        )
        state_payloads[str(uf)] = {
            "uf": str(uf),
            "nome_estado": state_name,
            "total_municipios": int(state_rows["cd_municipio"].nunique()),
            "totais": state_totals,
            "pos_17h": state_pos17,
            "viradas_municipios": flips,
            "municipios": municipality_payloads,
            "data_source": data_source,
        }

    national_totals = {}
    for turn in (1, 2):
        municipal = first_municipal if turn == 1 else second_municipal
        national_totals[f"t{turn}"] = {
            metric: int(municipal[f"{metric}_t{turn}"].sum())
            for metric in TURN_METRICS
        }
    summary = {
        "updated_at": generated_at or datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "totais_brasil": national_totals,
        "pos_17h_brasil": national_post,
        "ufs": [
            {"sigla": uf, "nome": UF_NAMES[uf]}
            for uf in sorted(state_payloads)
        ],
        "data_source": data_source,
    }
    return summary, state_payloads


def write_outputs(output_dir: Path, summary: dict[str, Any], states: dict[str, dict[str, Any]]) -> None:
    validate_outputs(summary, states)
    states_dir = output_dir / "states"
    states_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    payloads = [(output_dir / "summary.json", summary)] + [
        (states_dir / f"{uf}.json", payload)
        for uf, payload in sorted(states.items())
    ]
    for destination, payload in payloads:
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        try:
            temporary.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                encoding="utf-8",
            )
            temporary.replace(destination)
        except (OSError, TypeError, ValueError) as exc:
            temporary.unlink(missing_ok=True)
            raise EtlError(f"Não foi possível gravar {destination}: {exc}") from exc
    LOGGER.info("Arquivos JSON gravados: %d (resumo + %d UFs)", len(payloads), len(states))


def validate_outputs(summary: dict[str, Any], states: dict[str, dict[str, Any]]) -> None:
    """Validate payload shape and reconcile national totals against state partitions."""
    required_summary = {"updated_at", "totais_brasil", "pos_17h_brasil", "ufs", "data_source"}
    if not required_summary.issubset(summary):
        raise EtlError(f"Resumo nacional sem campos obrigatórios: {sorted(required_summary - summary.keys())}")
    if not states:
        raise EtlError("Nenhum arquivo estadual foi produzido")
    if set(states) != {item["sigla"] for item in summary["ufs"]}:
        raise EtlError("A lista de UFs do resumo não corresponde aos arquivos estaduais")

    def require_integer(value: Any, field: str) -> int:
        if type(value) is not int or value < 0:
            raise EtlError(f"Campo {field} deve ser inteiro não negativo, recebido: {value!r}")
        return value

    state_fields = {
        "uf", "nome_estado", "total_municipios", "totais", "pos_17h",
        "viradas_municipios", "municipios", "data_source",
    }
    municipality_fields = {"cd_mun", "nome", "flipped", "t1", "t2", "pos_17h"}
    municipality_post_fields = ("secoes_totais", "secoes_pos_17h", "votos_lula", "votos_bolsonaro")
    for uf, state in states.items():
        if state_fields - state.keys():
            raise EtlError(f"Arquivo estadual {uf} sem campos: {sorted(state_fields - state.keys())}")
        if not isinstance(state["municipios"], list) or not isinstance(state["viradas_municipios"], list):
            raise EtlError(f"Listas de municípios ou viradas inválidas em {uf}")
        for index, municipality in enumerate(state["municipios"]):
            if municipality_fields - municipality.keys():
                raise EtlError(f"Município {index} em {uf} sem campos obrigatórios")
            if type(municipality["flipped"]) is not bool:
                raise EtlError(f"Campo flipped inválido em {uf}, município {index}")
            for turn in ("t1", "t2"):
                for metric in TURN_METRICS:
                    require_integer(municipality[turn].get(metric), f"{uf}.municipios[{index}].{turn}.{metric}")
            for field in municipality_post_fields:
                require_integer(
                    municipality["pos_17h"].get(field),
                    f"{uf}.municipios[{index}].pos_17h.{field}",
                )

    for turn in ("t1", "t2"):
        national = summary["totais_brasil"].get(turn)
        if not isinstance(national, dict) or set(TURN_METRICS) - national.keys():
            raise EtlError(f"Resumo nacional inválido para {turn}")
        for metric in TURN_METRICS:
            expected = sum(
                require_integer(state["totais"][turn].get(metric), f"{uf}.totais.{turn}.{metric}")
                for uf, state in states.items()
            )
            observed = require_integer(national.get(metric), f"totais_brasil.{turn}.{metric}")
            if observed != expected:
                raise EtlError(
                    f"Total nacional não reconcilia para {turn}.{metric}: {observed} != {expected}"
                )

        for uf, state in states.items():
            if set(TURN_METRICS) - state["totais"].get(turn, {}).keys():
                raise EtlError(f"Totais estaduais inválidos para {uf}/{turn}")
            for metric in TURN_METRICS:
                municipality_sum = sum(
                    require_integer(municipality["t" + turn[-1]].get(metric), f"{uf}.{turn}.{metric}")
                    for municipality in state["municipios"]
                )
                if municipality_sum != state["totais"][turn][metric]:
                    raise EtlError(
                        f"Total estadual não reconcilia para {uf}/{turn}.{metric}: "
                        f"{state['totais'][turn][metric]} != {municipality_sum}"
                    )

    post_fields = (
        "secoes_total", "secoes_pos_17h", "votos_lula_pos_17h",
        "votos_bolsonaro_pos_17h", "brancos_pos_17h", "nulos_pos_17h",
    )
    national_post = summary["pos_17h_brasil"]
    for field in post_fields:
        national_value = require_integer(national_post.get(field), f"pos_17h_brasil.{field}")
        state_sum = sum(
            require_integer(state["pos_17h"].get(field), f"{uf}.pos_17h.{field}")
            for uf, state in states.items()
        )
        if national_value != state_sum:
            raise EtlError(f"Total nacional pós-17h não reconcilia para {field}: {national_value} != {state_sum}")
    for uf, state in states.items():
        if state["total_municipios"] != len(state["municipios"]):
            raise EtlError(f"total_municipios não corresponde à lista de municípios em {uf}")
        if state.get("data_source") != summary["data_source"]:
            raise EtlError(f"Marcador data_source inconsistente em {uf}")


def _demo_section(
    uf: str,
    municipality: str,
    name: str,
    section: str,
    *,
    lula: int,
    bolsonaro: int,
    demais: int,
    brancos: int,
    nulos: int,
) -> dict[str, Any]:
    return {
        "sg_uf": uf,
        "cd_municipio": municipality,
        "nr_zona": "1",
        "nr_secao": section,
        "nm_municipio": name,
        "lula": lula,
        "bolsonaro": bolsonaro,
        "demais": demais,
        "brancos": brancos,
        "nulos": nulos,
        "validos": lula + bolsonaro + demais,
    }


def demo_payloads(generated_at: str | None = None):
    """Generate clearly labeled, synthetic data to exercise the complete output contract."""
    t1 = pd.DataFrame([
        _demo_section("AC", "00001", "MUNICÍPIO DEMO A", "1", lula=40, bolsonaro=60, demais=10, brancos=2, nulos=3),
        _demo_section("AC", "00001", "MUNICÍPIO DEMO A", "2", lula=30, bolsonaro=70, demais=5, brancos=1, nulos=2),
        _demo_section("SP", "00002", "MUNICÍPIO DEMO B", "1", lula=80, bolsonaro=20, demais=0, brancos=1, nulos=1),
    ])
    t2 = pd.DataFrame([
        _demo_section("AC", "00001", "MUNICÍPIO DEMO A", "1", lula=70, bolsonaro=30, demais=0, brancos=1, nulos=1),
        _demo_section("AC", "00001", "MUNICÍPIO DEMO A", "2", lula=50, bolsonaro=50, demais=0, brancos=1, nulos=1),
        _demo_section("SP", "00002", "MUNICÍPIO DEMO B", "1", lula=85, bolsonaro=15, demais=0, brancos=1, nulos=1),
    ])
    attendance_t1 = pd.DataFrame([
        {"sg_uf": "AC", "cd_municipio": "00001", "aptos": 500, "abstencao": 100},
        {"sg_uf": "SP", "cd_municipio": "00002", "aptos": 200, "abstencao": 50},
    ])
    attendance_t2 = pd.DataFrame([
        {"sg_uf": "AC", "cd_municipio": "00001", "aptos": 500, "abstencao": 90},
        {"sg_uf": "SP", "cd_municipio": "00002", "aptos": 200, "abstencao": 40},
    ])
    bulletins = pd.DataFrame([
        {"sg_uf": "AC", "cd_municipio": "00001", "nr_zona": "1", "nr_secao": "1", "dh_geracao": time(17, 1)},
        {"sg_uf": "AC", "cd_municipio": "00001", "nr_zona": "1", "nr_secao": "2", "dh_geracao": time(16, 59)},
        {"sg_uf": "SP", "cd_municipio": "00002", "nr_zona": "1", "nr_secao": "1", "dh_geracao": time(17, 0)},
    ])
    return build_outputs(t1, t2, attendance_t1, attendance_t2, bulletins, "demo", generated_at)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first-turn", type=Path, help="CSV TSE de votação por seção do 1º turno")
    parser.add_argument("--second-turn", type=Path, help="CSV TSE de votação por seção do 2º turno")
    parser.add_argument("--attendance", type=Path, help="CSV de aptos/abstenções por seção, com NR_TURNO")
    parser.add_argument("--bu", type=Path, help="CSV de Boletins do 2º turno contendo DH_GERACAO")
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW, help=f"Pasta de origem (padrão: {DEFAULT_RAW})")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT, help=f"Pasta de saída (padrão: {DEFAULT_OUTPUT})")
    parser.add_argument("--delimiter", default=";", help="Separador dos CSVs (padrão TSE: ';')")
    parser.add_argument("--encoding", default="latin-1", help="Codificação dos CSVs (padrão: latin-1)")
    parser.add_argument("--demo", action="store_true", help="Gerar somente dados sintéticos, claramente marcados como demo")
    return parser.parse_args(argv)


def _resolve_inputs(args: argparse.Namespace) -> tuple[Path, Path, Path, Path]:
    if any((args.first_turn, args.second_turn, args.attendance, args.bu)):
        missing = [
            flag for flag, value in (
                ("--first-turn", args.first_turn),
                ("--second-turn", args.second_turn),
                ("--attendance", args.attendance),
                ("--bu", args.bu),
            ) if value is None
        ]
        if missing:
            raise EtlError(f"Para execução com dados reais, informe todos os arquivos: {', '.join(missing)}")
        return args.first_turn, args.second_turn, args.attendance, args.bu
    candidates = (
        args.raw_dir / "votacao_t1.csv",
        args.raw_dir / "votacao_t2.csv",
        args.raw_dir / "comparecimento_abstencao.csv",
        args.raw_dir / "boletins_t2.csv",
    )
    absent = [path.name for path in candidates if not path.is_file()]
    if absent:
        raise EtlError(
            f"Não encontrei os CSVs padrão em {args.raw_dir}: {', '.join(absent)}. "
            "Informe os caminhos com as opções --first-turn, --second-turn, --attendance e --bu, "
            "ou use --demo para gerar dados fictícios."
        )
    return candidates


def run(args: argparse.Namespace) -> None:
    if args.demo:
        if any((args.first_turn, args.second_turn, args.attendance, args.bu)):
            raise EtlError("--demo não pode ser combinado com arquivos de dados reais")
        LOGGER.warning("Executando em modo DEMO: os valores gerados são fictícios e não representam resultados oficiais.")
        summary, states = demo_payloads()
    else:
        first_path, second_path, attendance_path, bu_path = _resolve_inputs(args)
        LOGGER.info("Lendo votação do 1º turno: %s", first_path)
        votes_t1 = read_votes(first_path, 1, args.delimiter, args.encoding)
        LOGGER.info("Lendo votação do 2º turno: %s", second_path)
        votes_t2 = read_votes(second_path, 2, args.delimiter, args.encoding)
        LOGGER.info("Lendo comparecimento e abstenções: %s", attendance_path)
        attendance = {
            turn: read_attendance(attendance_path, turn, args.delimiter, args.encoding)
            for turn in (1, 2)
        }
        LOGGER.info("Lendo horários dos Boletins de Urna do 2º turno: %s", bu_path)
        bulletins = read_bulletins(bu_path, args.delimiter, args.encoding)
        summary, states = build_outputs(
            votes_t1,
            votes_t2,
            attendance[1],
            attendance[2],
            bulletins,
            "tse",
        )
        LOGGER.info(
            "Dados oficiais processados: %d seções no 1º turno, %d no 2º turno, %d UFs",
            len(votes_t1), len(votes_t2), len(states),
        )
    write_outputs(args.output_dir, summary, states)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        run(_parse_args(argv))
    except EtlError as exc:
        LOGGER.error("%s", exc)
        return 2
    except (OSError, pd.errors.ParserError, ValueError) as exc:
        LOGGER.exception("Falha inesperada durante o processamento: %s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
