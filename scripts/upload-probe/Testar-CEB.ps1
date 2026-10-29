# Windows PowerShell 5.1 / PowerShell 7. No external modules; no persistent secrets.
param([Parameter(Mandatory=$true)][ValidatePattern('^[0-9a-f-]{36}$')][string]$RunId)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(30)
$base = 'https://ceb-biblioteca-api.wllmslv10.workers.dev'
$token = $null
function Send-CEB($method,$path,$bytes,$authenticated=$true) {
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::new($method),($base+$path))
    try {
        if ($authenticated -and $token) { $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$token) }
        if ($null -ne $bytes) { $req.Content = [System.Net.Http.ByteArrayContent]::new([byte[]]$bytes) }
        $resp = $client.SendAsync($req).GetAwaiter().GetResult()
        try { return @{ Status=[int]$resp.StatusCode; Bytes=$resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult() } } finally { $resp.Dispose() }
    } finally { $req.Dispose() }
}
function Decode-CEB($reply) { return ([Text.Encoding]::UTF8.GetString($reply.Bytes) | ConvertFrom-Json) }
function Hash-CEB([byte[]]$bytes) {
    $sha=[Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
}
function Read-Protected([string]$label) {
    $secure = Read-Host $label -AsSecureString
    $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $secure.Dispose() }
}
try {
    # Validate only technical fixtures before requesting any credentials.
    $files = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'files.json') -Raw | ConvertFrom-Json
    foreach ($file in $files) {
        $data=[IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $file.name))
        if ($data.Length -ne $file.bytes -or (Hash-CEB $data) -ne $file.sha256) { throw 'fixture' }
    }
    $username=Read-Protected 'Usuario administrativo da CEB (entrada oculta)'
    $password=Read-Protected 'Senha da CEB (entrada oculta)'
    $payload=[Text.Encoding]::UTF8.GetBytes((@{username=$username;password=$password}|ConvertTo-Json -Compress))
    try { $login=Send-CEB 'POST' '/auth/login' $payload $false } finally { [Array]::Clear($payload,0,$payload.Length); $payload=$null; $password=$null; $username=$null }
    if ($login.Status -ne 200) { throw 'login' }
    $token=(Decode-CEB $login).access_token; $login=$null
    if (-not $token) { throw 'session' }
    $me=Send-CEB 'GET' '/auth/me' $null
    if ($me.Status -ne 200) { throw 'session' }
    $user=(Decode-CEB $me).user; $me=$null
    if ($user.role -ne 'admin' -or $user.must_change_password) { throw 'admin' }
    Write-Host 'Perfil administrativo confirmado pelo servidor.'
    $root='/library/_upload-probe/'+$RunId
    $status=Send-CEB 'GET' $root $null
    if ($status.Status -ne 200) { throw 'disabled' }
    $config=Decode-CEB $status
    if ($config.uploads_enabled -ne $false -or $config.run -ne $RunId -or [DateTimeOffset]::Parse($config.end) -le [DateTimeOffset]::UtcNow) { throw 'config' }
    foreach ($file in $files) {
        $server=@($config.files | Where-Object { $_.format -eq $file.format })
        if ($server.Count -ne 1 -or $server[0].sha256 -ne $file.sha256 -or $server[0].bytes -ne $file.bytes) { throw 'manifest' }
        $path=$root+'/'+$file.format
        $anon=Send-CEB 'GET' $path $null $false
        if ($anon.Status -notin @(401,403)) { throw 'anonymous' }
        $data=[IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $file.name))
        $put=Send-CEB 'PUT' $path $data
        if ($put.Status -ne 201) { throw 'upload' }
        $duplicate=Send-CEB 'PUT' $path $data
        if ($duplicate.Status -ne 409) { throw 'overwrite' }
        $get=Send-CEB 'GET' $path $null
        if ($get.Status -ne 200 -or $get.Bytes.Length -ne $file.bytes -or (Hash-CEB $get.Bytes) -ne $file.sha256) { throw 'integrity' }
        Write-Host ($file.format.ToUpperInvariant()+': envio, recuperacao, integridade e bloqueios OK.')
    }
    Write-Host 'TESTE CONCLUIDO. Informe somente este resultado ao Work. A excecao ainda deve ser removida e sua indisponibilidade verificada.'
} catch {
    # Never print exceptions, request/response bodies, usernames, passwords or tokens.
    Write-Host 'TESTE INTERROMPIDO. Nenhuma substituicao de material e permitida. Informe apenas que houve falha; nao compartilhe credenciais.'
} finally {
    if ($token) { try { $logout=Send-CEB 'POST' '/auth/logout' $null; if ($logout.Status -ne 200) { Write-Host 'Nao foi possivel confirmar o encerramento da sessao.' } } catch { Write-Host 'Nao foi possivel confirmar o encerramento da sessao.' } }
    $token=$null; $password=$null; $username=$null; $client.Dispose(); $handler.Dispose()
}
