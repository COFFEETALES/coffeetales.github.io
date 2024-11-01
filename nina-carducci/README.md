vim: set ft=ps1 tabstop=2 shiftwidth=2 expandtab :

Copie vers le github pages en local:

cd C:\dev\ocr\Nina-Carducci-Dev
yarn run make
cd C:\dev\ocr\coffeetales.github.io
Robocopy C:\dev\ocr\Nina-Carducci-Dev\ C:\dev\ocr\coffeetales.github.io\nina-carducci\ /PURGE /XD .git /XD node_modules /XF .gitignore /XF *.png /XF *.jpg /XF *.jpeg /E /COPY:D /DCOPY:D /R:2 /W:5 /XJ /NFL /NJS /NC /NS
git add nina-carducci
git commit --amend --no-edit
git push origin master --force

