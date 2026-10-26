import csv
import json
import tempfile
import unittest
from pathlib import Path

from process_tse import main


class ProcessTseTests(unittest.TestCase):
    def _write_csv(self, path: Path, headers: list[str], rows: list[list[str]]) -> None:
        with path.open("w", encoding="latin-1", newline="") as output:
            writer = csv.writer(output, delimiter=";")
            writer.writerow(headers)
            writer.writerows(rows)

    def test_demo_mode_generates_explicitly_labeled_partitioned_json(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "output"
            result = main(["--demo", "--output-dir", str(output)])
            self.assertEqual(result, 0)

            summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
            acre = json.loads((output / "states" / "AC.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["data_source"], "demo")
            self.assertEqual({item["sigla"] for item in summary["ufs"]}, {"AC", "SP"})
            self.assertEqual(acre["municipios"][0]["flipped"], True)
            self.assertEqual(acre["pos_17h"]["secoes_pos_17h"], 1)
            self.assertEqual(acre["pos_17h"]["votos_lula_pos_17h"], 70)

    def test_tse_csv_pipeline_filters_president_and_uses_strict_17h_cutoff(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            first = folder / "t1.csv"
            second = folder / "t2.csv"
            attendance = folder / "attendance.csv"
            bulletins = folder / "bu.csv"
            output = folder / "output"
            vote_headers = [
                "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO",
                "NR_TURNO", "CD_CARGO", "DS_CARGO", "NR_VOTAVEL", "NM_VOTAVEL", "QT_VOTOS",
            ]
            self._write_csv(first, vote_headers, [
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "1", "1", "Presidente", "13", "LULA", "40"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "1", "1", "Presidente", "22", "JAIR BOLSONARO", "60"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "1", "1", "Presidente", "95", "VOTO BRANCO", "2"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "1", "1", "Presidente", "96", "VOTO NULO", "3"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "1", "2", "Governador", "13", "LULA", "999"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "2", "1", "1", "Presidente", "13", "LULA", "10"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "2", "1", "1", "Presidente", "22", "JAIR BOLSONARO", "5"],
            ])
            self._write_csv(second, vote_headers, [
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "2", "1", "Presidente", "13", "LULA", "70"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "2", "1", "Presidente", "22", "JAIR BOLSONARO", "30"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "2", "1", "Presidente", "95", "VOTO BRANCO", "1"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "1", "2", "1", "Presidente", "96", "VOTO NULO", "1"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "2", "2", "1", "Presidente", "13", "LULA", "10"],
                ["AC", "00001", "MUNICIPIO TESTE", "1", "2", "2", "1", "Presidente", "22", "JAIR BOLSONARO", "5"],
            ])
            attendance_headers = [
                "SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_TURNO", "QT_APTOS", "QT_ABSTENCOES",
            ]
            self._write_csv(attendance, attendance_headers, [
                ["AC", "00001", "1", "1", "1", "120", "15"],
                ["AC", "00001", "1", "1", "2", "120", "10"],
                ["AC", "00001", "1", "2", "1", "100", "10"],
                ["AC", "00001", "1", "2", "2", "100", "10"],
            ])
            self._write_csv(
                bulletins,
                ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "DH_GERACAO"],
                [
                    ["AC", "00001", "1", "1", "30/10/2022 17:00:01"],
                    ["AC", "00001", "1", "2", "30/10/2022 17:00:00"],
                ],
            )

            result = main([
                "--first-turn", str(first),
                "--second-turn", str(second),
                "--attendance", str(attendance),
                "--bu", str(bulletins),
                "--output-dir", str(output),
            ])
            self.assertEqual(result, 0)

            summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
            state = json.loads((output / "states" / "AC.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["data_source"], "tse")
            self.assertEqual(summary["totais_brasil"]["t1"]["lula"], 50)
            self.assertEqual(summary["totais_brasil"]["t1"]["aptos"], 220)
            self.assertEqual(summary["pos_17h_brasil"]["secoes_pos_17h"], 1)
            self.assertEqual(summary["pos_17h_brasil"]["votos_lula_pos_17h"], 70)
            self.assertEqual(summary["pos_17h_brasil"]["secoes_total"], 2)
            self.assertEqual(state["municipios"][0]["flipped"], True)
            self.assertEqual(state["viradas_municipios"][0]["t1_vencedor"], "BOLSONARO")

    def test_partial_real_input_is_rejected_without_generating_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "output"
            result = main([
                "--first-turn", str(Path(temporary) / "t1.csv"),
                "--output-dir", str(output),
            ])
            self.assertEqual(result, 2)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
