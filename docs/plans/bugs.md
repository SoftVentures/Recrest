# Bugs I found in the system (phase 1)

## General

- Wenn oben auf reload gedrückt soll danach eine successNotification mit einer bestätigung oder errorNotification kommen von wegen geht nicht. Mit sonner
- Rechts neben dem Repo hinzufügen soll ein ButtonGroup sein mit default 'Lokal' und der anderen option 'Global' (wird später relevant)

## Dashboard

- Weniger items im skeleton loader als tatsächlich sichtbar (unten rechts fehlt)
- aktivität card soll tooltip beim hovern immer 8px über dem ende des jeweiligen graphen zeigen nicht strikt oben
- Braucht deine Aufmerksamkeit steht 4 items, angezeigt werden aber nur 3
- Offene Merge Requests card zeigt neben den rows 'running' an, das ist falsch und da soll nichts pulsieren. Lösche das
- Mehr Schnellaktionen

## Repositories

- ButtonGroup wechselt nicht zwischen den modi
- Filter optionen fehlen eg: Nach zuletzt bearbeitet filtern oder sowas

## Merge Requests

- Seite nutzt nicht die volle höhe
- Right Drawer ist komplett falsch, sollte gleich wie der von Repos sein, mit anderen infos.
- Die page unterscheidet sich gänzlich von den anderen

## Changes

- ButtonGroup wechselt nicht zwischen den modi

## Branches

- Fold option fehlt

## Activity

- Offene MRS card: dieser balken hat keinen sinn -> weg
- CI Health -> warum ein einfarbiger kreis und was nimmt welche farbe ein? -> macht wenig sinn
- Commit-Aktivität card design gebrochen
- MR-Velocity: komische eckige balken/graph lines anstelle von ordentlichen graph design. Gleiches in CI PASS RATE
- Review-Queue hat immer noch text der nicht '...' wird
- Top Contributors sowie authoren und dropdown zeigen den gleichen author unterschiedlich geschreiben 2 mal an.
