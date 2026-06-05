$port = 8080
$root = 'c:\WorkSpace\Web\qiezi'
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Output "Server running at:"
Write-Output "  Local:   http://localhost:$port/news.html"
Write-Output "  LAN:     http://10.32.112.17:$port/news.html"
Write-Output "Press Ctrl+C to stop."

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.json' = 'application/json'
    '.csv'  = 'text/csv; charset=utf-8'
    '.tsv'  = 'text/tab-separated-values; charset=utf-8'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
    '.gif'  = 'image/gif'
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)
        $writer.AutoFlush = $false

        $line = $reader.ReadLine()
        if (-not $line) { $client.Close(); continue }

        $parts = $line -split ' '
        $method = $parts[0]
        $url = $parts[1]

        # Read headers
        while ($reader.ReadLine() -ne '') { }

        if ($url -match '\?') { $url = $url.Substring(0, $url.IndexOf('?')) }
        $path = $url.TrimStart('/')
        # URL-decode Chinese filenames
        $path = [Uri]::UnescapeDataString($path)
        if ($path -eq '') { $path = 'news.html' }
        $file = Join-Path $root $path

        if ((Test-Path $file -PathType Leaf) -and ($file.StartsWith($root))) {
            $ext = [IO.Path]::GetExtension($file).ToLower()
            $ct = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
            $bytes = [IO.File]::ReadAllBytes($file)

            $sb = New-Object System.Text.StringBuilder
            [void]$sb.AppendLine("HTTP/1.1 200 OK")
            [void]$sb.AppendLine("Content-Type: $ct")
            [void]$sb.AppendLine("Content-Length: $($bytes.Length)")
            [void]$sb.AppendLine("Connection: close")
            [void]$sb.AppendLine("Access-Control-Allow-Origin: *")
            [void]$sb.AppendLine("")
            $writer.Write($sb.ToString())
            $writer.Flush()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush()
        } else {
            $body = '<h1>404 Not Found</h1>'
            $b = [Text.Encoding]::UTF8.GetBytes($body)
            $sb = New-Object System.Text.StringBuilder
            [void]$sb.AppendLine("HTTP/1.1 404 Not Found")
            [void]$sb.AppendLine("Content-Type: text/html; charset=utf-8")
            [void]$sb.AppendLine("Content-Length: $($b.Length)")
            [void]$sb.AppendLine("Connection: close")
            [void]$sb.AppendLine("")
            $writer.Write($sb.ToString())
            $writer.Flush()
            $stream.Write($b, 0, $b.Length)
            $stream.Flush()
        }
        $client.Close()
    } catch {
        # Ignore client errors
    }
}
