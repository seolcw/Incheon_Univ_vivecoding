<#
현재 PowerShell 창에 Firebase 환경변수를 설정한다. 원본 파일은 변경하지 않는다.
backend 폴더에서 실행:
  & .\scripts\load_firebase_env.ps1 -ServiceAccountPath 'C:\개인폴더\firebase-key.json'
이후 같은 창에서 .\.venv\Scripts\python -m uvicorn main:app --port 8000 실행.
키 내용은 출력하지 않으며 Firestore 접속 검사는 별도로 해야 한다.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ServiceAccountPath
)

$ErrorActionPreference = 'Stop'

try {
    $credentialFile = Get-Item -LiteralPath $ServiceAccountPath -ErrorAction Stop
    if ($credentialFile.PSIsContainer) { throw 'not a file' }
} catch {
    throw '인증 JSON 파일을 찾거나 읽을 수 없습니다. 파일 경로를 확인해 주세요.'
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$repositoryPrefix = $repositoryRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
if ($credentialFile.FullName.StartsWith($repositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw '인증 JSON은 Git 저장소 밖의 개인 폴더에 보관한 뒤 그 경로를 지정해 주세요.'
}

try {
    $credentialJson = Get-Content -LiteralPath $credentialFile.FullName -Raw -Encoding UTF8 -ErrorAction Stop
    $credential = ConvertFrom-Json -InputObject $credentialJson -ErrorAction Stop
} catch {
    # 파싱 예외 원문에는 비밀값이 포함될 수 있어 출력하지 않는다.
    throw '인증 파일을 UTF-8 JSON으로 읽을 수 없습니다. 수정하지 않은 원본 파일인지 확인해 주세요.'
}

if ($credential.type -ne 'service_account' -or
    [string]::IsNullOrWhiteSpace($credential.project_id) -or
    [string]::IsNullOrWhiteSpace($credential.client_email) -or
    [string]::IsNullOrWhiteSpace($credential.private_key)) {
    throw 'service_account 원본 JSON에 project_id, client_email, private_key가 필요합니다. 내용은 채팅에 보내지 마세요.'
}

$env:FIREBASE_SERVICE_ACCOUNT_JSON = $credentialJson
$env:STORAGE = 'firestore'
Write-Host '현재 PowerShell 창에 Firebase 환경변수를 설정했습니다. 원본 파일은 변경하지 않았습니다.'
Write-Host '아직 접속 검사는 하지 않았습니다. B의 db.py 연결 후 같은 창에서 서버를 실행하세요.'
