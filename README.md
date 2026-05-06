# YTMP3

Application Windows simple pour mettre plusieurs URL YouTube en attente, choisir un format MP3/MP4 avec une qualite, puis telecharger toute la file.

## Utilisation

- Lancer le portable genere : `dist/YTMP3 0.1.0.exe`
- En developpement : `npm start`
- Rebuild portable : `npm run build:portable`

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
