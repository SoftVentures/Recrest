# This is a page about bugs and future idea of this application

## Bugs

### Plattformübergreifend

- Der Drawer in merge requests view ist optisch ein anderer im Vergleich zu den anderen views und er ist schlechter
- Ich sollte nur MR spezifische notifications bekommen, wenn ich der assigne bin, also wenn mir der MR zugewiesen wurde. Wir sollten alle anzeigen, aber notifications und wirklich bearbeiten sollte ich nur, wenn ich tatsächlich der assignee dafür bin.
- In 'Review queue' in statistics überschreiten die labels den rand. In all diesen felden, nicht nur diesem sollten wir truncaten `...`
- Derzeit werden die authoren falsch zusammengefasst. kann das bei der signatur zusammengefasst werden? mein name hat einen umlaut und in dem einen system ist es ö und im anderen oe. Das wird aber 2 verschiedene authoren wargenommen.
- wenn repo pinned, nicht oben
- "checks failed" zu pipelines failed - zu generisch
- full repo view, mr buggy

### Repo-Aktionen (kaputt)

- open repo in terminal geht nicht
- open in folder geht auch nicht

### UI / Visuelle Bugs

- dashbaord -> lang mix: legende unten, diagramm größer
- repo default avatar, hell oben links, dunkel unten rechts -> einheitlich
- bei dirgrammen einheitlicher colofade

### macOS

- Wenn ich die app schließe mit x im head dann befindet die app sich im tray. Wenn ich command+space mache und den appnamen eingebe und enter mache geht die app nicht in den Vordergrund - nur im tray clicken öffnet die app wirklich / oder zeigt sie im vordergrund

### Windows

- wenn man oben rechts über die items hovert kommen tooltips (klein, minimieren & schließen)
- für eben diese actions muss aber in minimieren/maximieren beim hover wie in jedem anderen windows app das arrange menu zu sehen sein (dieses windows popup was die unterschiedlichen window größen und arrangements zeigt)
- autostart funktioniert nicht
- start minimized aktivieren führt zum minimieren des windows.

### Linux

- Wayland verwenden (neuerer Desktop Standart - fixt auch skalierung)
- skaling fix
- icon/logo bei notification (ich verwende dunst als notification deamon auf linux (Arch))

## Future Ideas

### Allgemeine UX

- in verschiedenen pages gibt es einen horizontalen scroll. Aber die Boxen etc müssen sich ans bild anpassen (Da wo nur tabellen view ist soll die möglichkeit (auch im generellen) auch eine card view zu zeigen)
- In Branch view sollte man die verschiedenen bereiche ein und ausklappen können, filter optionen sowie eine suche haben
- bei vielen buttons muss es eine art confirmation dialog geben
- wizard "zurück" option
- wischgesten support
- Hotkey für manuelle Skalierung + verküpfung (sync) in Programm settings
- scroll wird gemerkt

### Repo-Verwaltung

- bei repo import default verwenden
- bei mehreren ordnern "default" folder festlegbar
- bei repo logo  auch favicon nutzen
- click auf pin icon to unpin
- repo übersicht: nach ordner (aktuelle ansicht) aber auch als reine liste mit welche dann oben über den "tabellen/listenkopf" sortiert werden kann
- repo funktion für ssh

### Git-Aktionen

- Man soll stagen und unstagen können sollen
- Man soll commiten können default mit `{{author}}: {{date}}` -> Aber auch mit einer eigener nachricht
- Man sollte die git-config einsehen und bearbeiten können
- Finde noch andere git actions die man machen kann:
  - Git actions oder workflows verwalten
  - Merge requests mit code changes einsehen & Verwalten
  - wenn github pages auch das und jeweils das gitlab und bitbucket equivalent

### Provider-Integration (GitHub / GitLab / Bitbucket)

- Wir müssen wenn möglich die avatare etc von gitlab bekommen und bitbucket etc das man bei merge requestes auch sieht wer es ist und auch den namen anstelle von username
- gruppen von gitlab anzeigen orgas bei github

### Activity / Statistiken / Dashboard

- Es sollte nicht nur eine 14 Tage history sein, sondern viel mehr immer zeigen was lokal "ab" geht. Viel mehr sollte es die ganze history geben mit echten Insights
- activity custom timerang option
- activity mr-velo - gerundeted graph

### Einstellungen

- Im system punkt in general soll man auch das richtige terminal und terminalprofil auswählen können um es richtig zu öffnen
- bei git token description - welche settungs

### Qualität / Infrastruktur

- Wir müssen die Test suite erhöhen um alle solche dinge direkt auszubessern
