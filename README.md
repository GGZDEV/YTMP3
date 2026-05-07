# TubeDL

Application Windows simple pour mettre plusieurs URL YouTube en attente, choisir un format MP3/MP4 avec une qualite, puis telecharger toute la file.

## Utilisation

- Lancer le portable genere : `dist/TubeDL 0.1.0.exe`
- En developpement : `npm start`
- Rebuild portable : `npm run build:portable`

## Extension Brave

1. Ouvrir Brave sur `brave://extensions`
2. Activer le mode developpeur
3. Cliquer sur `Charger l'extension non empaquetee`
4. Selectionner le dossier `extension/`
5. Laisser TubeDL ouvert pendant l'utilisation de l'extension

L'extension envoie l'URL YouTube active a l'application locale via `http://127.0.0.1:17335`.

## Fonctionnalites

- Ajout de plusieurs URL avec le bouton `ADD`
- Telechargement de toute la file avec `DOWNLOAD`
- Formats MP3 et MP4
- Qualites MP3 : meilleure, 320 kbps, 192 kbps, 128 kbps
- Qualites MP4 : meilleure, 1080p, 720p, 480p, 360p
- Onglet Options pour le dossier de telechargement et les valeurs par defaut

## Notes

`yt-dlp.exe` est inclus dans `bin/` et FFmpeg est embarque via `ffmpeg-static`, ce qui permet la conversion MP3 et la fusion MP4.

Utilise l'application uniquement pour des contenus que tu as le droit de telecharger.
