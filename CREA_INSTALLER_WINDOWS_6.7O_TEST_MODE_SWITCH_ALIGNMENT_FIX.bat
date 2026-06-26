@echo off
title BUILD AT-MEC_HM_6.7O_TEST_MODE_SWITCH_ALIGNMENT_FIX
echo Creazione installer Windows AT-MEC_HM_6.7O_TEST_MODE_SWITCH_ALIGNMENT_FIX...
npm run build
npm run package:portable
pause
