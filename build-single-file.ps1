$ErrorActionPreference = "Stop"
$root = "c:\WorkSpace\Web\qiezi"
$outFile = "$root\news-full.html"

Write-Output "=== Step 1: Build inline index.html for iframe srcdoc ==="
$indexHtml = Get-Content "$root\index.html" -Raw -Encoding UTF8
$styleCss = Get-Content "$root\css\style.css" -Raw -Encoding UTF8
$appJs = Get-Content "$root\js\app.js" -Raw -Encoding UTF8

# Replace external CSS link with inline style
$indexHtml = $indexHtml -replace '<link rel="stylesheet" href="css/style.css">', "<style>`n$styleCss`n</style>"
# Replace external JS script with inline script
$indexHtml = $indexHtml -replace '<script src="js/app.js"></script>', "<script>`n$appJs`n</script>"

Write-Output "  index.html inlined: $($indexHtml.Length) chars"

Write-Output "=== Step 2: Read news.html ==="
$html = Get-Content "$root\news.html" -Raw -Encoding UTF8
Write-Output "  news.html: $($html.Length) chars"

Write-Output "=== Step 3: Inline external JS files ==="
# chart.min.js
$chartJs = Get-Content "$root\js\chart.min.js" -Raw -Encoding UTF8
$html = $html -replace '<script src="js/chart.min.js"></script>', "<script>`n$chartJs`n</script>"
Write-Output "  chart.min.js inlined: $($chartJs.Length) chars"

# echarts.min.js
$echartsJs = Get-Content "$root\js\echarts.min.js" -Raw -Encoding UTF8
$html = $html -replace '<script src="js/echarts.min.js"></script>', "<script>`n$echartsJs`n</script>"
Write-Output "  echarts.min.js inlined: $($echartsJs.Length) chars"

# china_geo.js
$chinaJs = Get-Content "$root\js\china_geo.js" -Raw -Encoding UTF8
$html = $html -replace '<script src="js/china_geo.js"></script>', "<script>`n$chinaJs`n</script>"
Write-Output "  china_geo.js inlined: $($chinaJs.Length) chars"

Write-Output "=== Step 4: Convert all images to base64 ==="
# Find all img tags with local src
$imgPattern = '<img\s+[^>]*src="([^"]+\.(jpg|png|jpeg|gif|webp|svg))"([^>]*)>'
$matches = [regex]::Matches($html, $imgPattern)

$converted = @{}
foreach ($m in $matches) {
    $fullTag = $m.Value
    $src = $m.Groups[1].Value
    $rest = $m.Groups[3].Value

    # Skip if already data URI or external URL
    if ($src -match '^https?://' -or $src -match '^data:') { continue }
    if ($converted.ContainsKey($src)) { continue }

    $imgPath = Join-Path $root $src
    if (-not (Test-Path $imgPath)) {
        Write-Output "  WARN: Image not found: $src"
        continue
    }

    $bytes = [IO.File]::ReadAllBytes($imgPath)
    $base64 = [Convert]::ToBase64String($bytes)
    $ext = $src -replace '.*\.', ''
    $mime = if ($ext -eq 'jpg' -or $ext -eq 'jpeg') { 'image/jpeg' } elseif ($ext -eq 'png') { 'image/png' } elseif ($ext -eq 'gif') { 'image/gif' } elseif ($ext -eq 'webp') { 'image/webp' } elseif ($ext -eq 'svg') { 'image/svg+xml' } else { 'application/octet-stream' }

    $dataUri = "data:$mime;base64,$base64"
    $newTag = $fullTag -replace [regex]::Escape("src=`"$src`""), "src=`"$dataUri`""
    $html = $html -replace [regex]::Escape($fullTag), $newTag

    $sizeKB = [math]::Round($bytes.Length / 1KB, 1)
    $base64KB = [math]::Round($base64.Length / 1KB, 1)
    Write-Output "  Converted: $src ($($sizeKB)KB -> base64 $($base64KB)KB)"
    $converted[$src] = $true
}

Write-Output "=== Step 5: Embed iframe as srcdoc ==="
# HTML-encode the inline index.html for srcdoc
$encodedIndex = $indexHtml -replace '&', '&amp;' -replace '"', '&quot;' -replace '<', '&lt;' -replace '>', '&gt;'
# Actually srcdoc takes raw HTML, no encoding needed! Just use the raw content with quotes escaped
$encodedIndex = $indexHtml -replace '"', '&quot;'

# Replace the iframe tag pattern
$iframePattern = '<iframe id="entryIframe" src="index\.html"([^>]*)></iframe>'
$srcdocIframe = '<iframe id="entryIframe" srcdoc="' + $encodedIndex + '"$1></iframe>'
$html = $html -replace $iframePattern, $srcdocIframe
Write-Output "  iframe replaced with srcdoc: $($indexHtml.Length) chars embedded"

Write-Output "=== Step 6: Save output ==="
$sw = New-Object System.IO.StreamWriter($outFile, $false, [Text.Encoding]::UTF8)
$sw.Write($html)
$sw.Close()
$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 1)
Write-Output "Output: $outFile"
Write-Output "Size: $sizeMB MB"
Write-Output "=== DONE ==="
