$ErrorActionPreference = "Stop"

# ============================================================
# Chinese Word Frequency Script for AI Fortune-telling data
# Uses bigram as word segmentation proxy
# ============================================================

$allText = ""

# 1. Read comments_full.tsv -> content column
Write-Host "Reading comments_full.tsv..." -ForegroundColor Cyan
$comments = Import-Csv "comments_full.tsv" -Delimiter "`t" -Encoding UTF8
foreach ($row in $comments) {
    if ($row.content) { $allText += $row.content + " " }
}
Write-Host "  Loaded comments: $($comments.Count)"

# 2. Read posts.tsv -> title + desc columns
Write-Host "Reading posts.tsv..." -ForegroundColor Cyan
$posts = Import-Csv "posts.tsv" -Delimiter "`t" -Encoding UTF8
foreach ($row in $posts) {
    if ($row.title)  { $allText += $row.title + " " }
    if ($row.desc)   { $allText += $row.desc + " " }
}
Write-Host "  Loaded posts: $($posts.Count)"

# 3. Read extracted manuscript
Write-Host "Reading manuscript..." -ForegroundColor Cyan
$manuscriptFile = Get-ChildItem -Path "." -Filter "*extracted.txt" | Select-Object -First 1
$manuscript = Get-Content $manuscriptFile.FullName -Encoding UTF8 -Raw
# Remove HTML tags and PARA markers
$manuscript = $manuscript -replace '<[^>]+>', ''
$manuscript = $manuscript -replace '\[PARA \d+ \| Color: -?\d+\]', ''
$allText += " " + $manuscript
Write-Host "  Loaded manuscript"

# ---------- Extract Chinese characters only ----------
Write-Host "Extracting Chinese characters..." -ForegroundColor Cyan
$chineseOnly = ""
foreach ($ch in $allText.ToCharArray()) {
    $code = [int]$ch
    if ($code -ge 0x4E00 -and $code -le 0x9FFF) {
        $chineseOnly += $ch
    }
}
Write-Host "  Total Chinese characters: $($chineseOnly.Length)"

# ---------- Character frequency ----------
Write-Host "Calculating character frequency..." -ForegroundColor Cyan
$charFreq = @{}
for ($i = 0; $i -lt $chineseOnly.Length; $i++) {
    $c = $chineseOnly[$i]
    if (-not $charFreq.ContainsKey($c)) { $charFreq[$c] = 0 }
    $charFreq[$c]++
}
$charRanked = $charFreq.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 200

# ---------- Bigram frequency ----------
Write-Host "Calculating bigram frequency..." -ForegroundColor Cyan
$bigramFreq = @{}
for ($i = 0; $i -lt $chineseOnly.Length - 1; $i++) {
    $bg = $chineseOnly.Substring($i, 2)
    if (-not $bigramFreq.ContainsKey($bg)) { $bigramFreq[$bg] = 0 }
    $bigramFreq[$bg]++
}
$bigramRanked = $bigramFreq.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 500

# ---------- Trigram frequency ----------
Write-Host "Calculating trigram frequency..." -ForegroundColor Cyan
$trigramFreq = @{}
for ($i = 0; $i -lt $chineseOnly.Length - 2; $i++) {
    $tg = $chineseOnly.Substring($i, 3)
    if (-not $trigramFreq.ContainsKey($tg)) { $trigramFreq[$tg] = 0 }
    $trigramFreq[$tg]++
}
$trigramRanked = $trigramFreq.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 300

# ---------- Output CSV ----------
Write-Host "Writing CSV files..." -ForegroundColor Cyan

# Character freq
$rank = 0
$charRanked | ForEach-Object {
    $rank++
    [PSCustomObject]@{ rank = $rank; char = $_.Key; count = $_.Value }
} | Export-Csv "word_freq_char.csv" -NoTypeInformation -Encoding UTF8
Write-Host "  word_freq_char.csv"

# Bigram freq
$rank = 0
$bigramRanked | ForEach-Object {
    $rank++
    [PSCustomObject]@{ rank = $rank; bigram = $_.Key; count = $_.Value }
} | Export-Csv "word_freq_bigram.csv" -NoTypeInformation -Encoding UTF8
Write-Host "  word_freq_bigram.csv"

# Trigram freq
$rank = 0
$trigramRanked | ForEach-Object {
    $rank++
    [PSCustomObject]@{ rank = $rank; trigram = $_.Key; count = $_.Value }
} | Export-Csv "word_freq_trigram.csv" -NoTypeInformation -Encoding UTF8
Write-Host "  word_freq_trigram.csv"

# ---------- Print TOP 30 ----------
Write-Host ""
Write-Host "=== TOP 30 Bigrams ===" -ForegroundColor Yellow
$top30 = $bigramRanked | Select-Object -First 30
$rank = 0
foreach ($item in $top30) {
    $rank++
    Write-Host ("  {0,3}. [{1}] : {2}" -f $rank, $item.Key, $item.Value)
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
