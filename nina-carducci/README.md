Idée d'exploration d'un mécanisme de préprocesseur HTML:

<code>
<!--{{^in_ca}}>-->
<link rel="stylesheet" href="./assets/bootstrap/bootstrap.css">
<!--{{/in_ca}}-->
<!--{{#in_ca}}>
<link rel="stylesheet" href="./assets/bootstrap/bootstrap.min.css">
<!  {{/in_ca}}-->
</code>

Copie vers le github pages en local:

cd C:\dev\ocr\coffeetales.github.io
Robocopy C:\dev\ocr\Nina-Carducci-Dev\ C:\dev\ocr\coffeetales.github.io\nina-carducci\ /PURGE /XD .git /XF .gitignore /E /COPY:D /DCOPY:D /R:2 /W:5 /XJ /NFL /NJS /NC /NS
git commit --amend --no-edit
git push origin master --force

