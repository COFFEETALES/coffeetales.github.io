# vim: set ft=ps1 tabstop=2 shiftwidth=2 expandtab :

# Changer le format des images pour amélioration des performances:

# winget install libwebp

cd C:\dev\ocr\Nina-Carducci-Dev
Get-ChildItem -LiteralPath . -Recurse -Include ('*.png', '*.jpg', '*.jpeg', '*.webp') -Exclude ('*.min.webp') | % {
  $TargetName = (
   [Text.RegularExpressions.Regex]::Replace(
    $_.FullName,
    '\.[^.]+$',
    '',
    [Text.RegularExpressions.RegexOptions]::CultureInvariant
   )
  )
  #Throw "File already exists: $TargetName"
  #Remove-Item -LiteralPath $TargetName

  #
  #& cwebp -q 50 ($_.FullName) -o $TargetName
  #

  [Uint32]$Width = $NULL
  [Bool]$RetVal = (
    [Uint32]::TryParse(
      (& magick identify -format '%w' ($_.FullName)),
      [Globalization.NumberStyles]::Integer,
      [CultureInfo]::InvariantCulture,
      [Ref]$Width
    )
  )

  If ('slider' -ieq (Get-Item -LiteralPath $_.FullName).Directory.Name) {
    & cwebp -q 60 ($_.FullName) -resize 480 0 -o ($TargetName, '.480.min.webp' -join '')
    & cwebp -q 60 ($_.FullName) -resize 768 0 -o ($TargetName, '.768.min.webp' -join '')
    & cwebp -q 60 ($_.FullName) -resize 1024 0 -o ($TargetName, '.1024.min.webp' -join '')
    & cwebp -q 60 ($_.FullName) -resize 1920 0 -o ($TargetName, '.1920.min.webp' -join '')
  }
  Else {
    If (3240 -le $Width) {
      & cwebp -q 60 ($_.FullName) -resize ($Width / 5.5) 0 -o ($TargetName, '.min.webp' -join '')
    }
    ElseIf (2160 -le $Width) {
      & cwebp -q 60 ($_.FullName) -resize ($Width / 5.0) 0 -o ($TargetName, '.min.webp' -join '')
    }
    ElseIf (1080 -le $Width) {
      & cwebp -q 60 ($_.FullName) -resize ($Width / 4.5) 0 -o ($TargetName, '.min.webp' -join '')
    }
    Else {
      & cwebp -q 60 ($_.FullName) -o ($TargetName, '.min.webp' -join '')
    }
  }
}

# Afficher les dimensions des images du projet

cd C:\dev\ocr\Nina-Carducci-Dev
Get-ChildItem -LiteralPath C:\dev\ocr\Nina-Carducci-Dev -Recurse -Filter ('*.min.webp') | % {
  & magick identify -format '%f  width="%w" height="%h"\n' ($_.FullName)
}

# Supprimer toutes les entrées générées

Get-ChildItem -LiteralPath C:\dev\ocr\Nina-Carducci-Dev -Recurse -Filter ('*.min.webp') | % {
  Remove-Item -LiteralPath $_.FullName
}


& magick identify -format '%f  width="%w" height="%h"\n' ('assets/images/gallery/mariage/jakob-owens-SiniLJkXhMc-unsplash.jpg')
& cwebp -q 60 ('assets/images/gallery/mariage/jakob-owens-SiniLJkXhMc-unsplash.jpg') -resize (4480 / 7.0) 0 -o ('assets/images/gallery/mariage/jakob-owens-SiniLJkXhMc-unsplash.min.webp')
