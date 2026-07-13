@echo off
title VEXON 10.1.15 - Installazione dipendenze
npm ci --legacy-peer-deps
npm run build
pause
