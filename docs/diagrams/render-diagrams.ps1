# Windows PowerShell / PowerShell on Windows. No additional packages required.
# Regenerate the README PNGs with: .\docs\diagrams\render-diagrams.ps1
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$outputDirectory = $PSScriptRoot
if (-not $outputDirectory) { throw 'Run this file from its saved path.' }
$script:ink = '#162C49'
$script:muted = '#53667E'
$script:blue = '#3267AC'
$script:teal = '#13766D'
$script:purple = '#7157A8'
$script:orange = '#AA5A1B'

function Brush([string] $hex) {
    return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}
function Pen([string] $hex, [single] $width = 2) {
    return [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
}
function RoundBox([single] $x, [single] $y, [single] $w, [single] $h, [string] $fill, [string] $border = '', [single] $radius = 20) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = 2 * $radius
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
    $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
    $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = Brush $fill
    $script:g.FillPath($brush, $path)
    $brush.Dispose()
    if ($border) {
        $pen = Pen $border 1.5
        $script:g.DrawPath($pen, $path)
        $pen.Dispose()
    }
    $path.Dispose()
}
function Label([string] $value, [single] $x, [single] $y, [single] $size = 22, [string] $color = '#162C49', [switch] $Bold) {
    $style = [System.Drawing.FontStyle]::Regular
    if ($Bold) { $style = [System.Drawing.FontStyle]::Bold }
    $font = [System.Drawing.Font]::new('Malgun Gothic', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = Brush $color
    $format = [System.Drawing.StringFormat]::GenericTypographic.Clone()
    $script:g.DrawString($value, $font, $brush, [System.Drawing.PointF]::new($x, $y), $format)
    $format.Dispose()
    $brush.Dispose()
    $font.Dispose()
}
function Arrow([double[]] $points, [string] $color = '#93A8C2', [switch] $Dashed) {
    $pen = Pen $color 3
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    if ($Dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
    $cap = [System.Drawing.Drawing2D.AdjustableArrowCap]::new(4, 5, $true)
    $pen.CustomEndCap = $cap
    $vertices = [System.Collections.Generic.List[System.Drawing.PointF]]::new()
    for ($i = 0; $i -lt $points.Length; $i += 2) {
        $vertices.Add([System.Drawing.PointF]::new($points[$i], $points[$i + 1]))
    }
    $script:g.DrawLines($pen, $vertices.ToArray())
    $pen.Dispose()
    $cap.Dispose()
}
function Card([single] $x, [single] $y, [single] $w, [single] $h, [string] $tag, [string] $title, [string[]] $lines, [string] $accent = '#3267AC', [string] $fill = '#FFFFFF') {
    RoundBox $x $y $w $h $fill '#DCE5F0'
    Label $tag ($x + 22) ($y + 20) 17 $accent -Bold
    Label $title ($x + 22) ($y + 54) 27 $script:ink -Bold
    $lineY = $y + 102
    foreach ($line in $lines) {
        Label $line ($x + 22) $lineY 21 $script:muted
        $lineY += 32
    }
}
function BeginCanvas([int] $height, [string] $section, [string] $title, [string] $subtitle) {
    $script:canvasHeight = $height
    $script:bmp = [System.Drawing.Bitmap]::new(2560, ($height * 2))
    $script:bmp.SetResolution(144, 144)
    $script:g = [System.Drawing.Graphics]::FromImage($script:bmp)
    $script:g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $script:g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $script:g.Clear([System.Drawing.ColorTranslator]::FromHtml('#F5F8FC'))
    $script:g.ScaleTransform(2, 2)
    Label "빈강 · BINGANG  /  $section" 48 28 18 $script:blue -Bold
    Label $title 48 66 36 $script:ink -Bold
    Label $subtitle 48 120 22 $script:muted
}
function EndCanvas([string] $name, [string] $note) {
    $y = $script:canvasHeight - 78
    RoundBox 48 $y 1184 48 '#E7EFF9' '' 12
    Label $note 68 ($y + 11) 19 $script:blue
    $script:g.Dispose()
    $target = Join-Path $outputDirectory $name
    $script:bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $script:bmp.Dispose()
    Write-Output $name
}

# 01. Main journey and optional AI entrance.
BeginCanvas 690 '01  USER JOURNEY' '빈 공간을 찾고, 함께 공부하기' '정보대 1–5층 · 시간표가 있는 26개 강의실'
Arrow @(308, 294, 352, 294)
Arrow @(616, 294, 660, 294)
Arrow @(924, 294, 968, 294)
Card 48 200 260 188 '01  EXPLORE' '지도 · 층 선택' @('정보대 → 원하는 층', '수업 없는 방 살펴보기')
Card 356 200 260 188 '02  CHECK' '강의실 확인' @('오늘 시간표 확인', '이용 가능한 시간 확인')
Card 664 200 260 188 '03  CREATE' '모임 만들기' @('목적 · 시간 · 정원 설정', '수업·모임 충돌 검사')
Card 972 200 260 188 '04  JOIN' '다른 기기 참여' @('같은 주소 → 모임 찾기', '참여 후 인원 갱신')
Arrow @(486, 452, 486, 393) $script:purple -Dashed
RoundBox 48 452 568 132 '#F0ECF9' '#DDD4EE'
Label '또 다른 시작점' 72 470 17 $script:purple -Bold
Label '횃불이에게 물어보기' 72 501 26 $script:ink -Bold
Label '“2시간 공부할 곳” → 추천 카드 → 강의실 상세' 72 544 20 $script:muted
RoundBox 664 452 568 132 '#E6F3EF' '#CBE5DD'
Label '노트북과 폰이 같은 모임을 공유' 688 471 24 $script:teal -Bold
RoundBox 688 522 176 42 '#FFFFFF' '' 12
RoundBox 1022 522 176 42 '#FFFFFF' '' 12
Label '주최자  1 / 4' 710 529 21 $script:teal -Bold
Label '참여 후  2 / 4' 1041 529 21 $script:teal -Bold
Arrow @(880, 543, 1006, 543) $script:teal
EndCanvas 'user-flow.png' '같은 공개 URL · 다른 기기/브라우저 사용자 · 약 5초마다 갱신 · 모임은 공식 예약이 아닙니다'

# 02. Browser and service boundaries; only FastAPI accesses private services.
BeginCanvas 800 '02  ARCHITECTURE' '웹과 API가 나누어 처리합니다' '시간표는 JSON에서 읽고, 모임은 Firestore에 저장합니다'
Label '사용자' 48 202 18 $script:muted -Bold
Label 'Render · 웹' 350 202 18 $script:muted -Bold
Label 'Render · API' 652 202 18 $script:muted -Bold
Label '데이터 · 외부 AI' 954 158 18 $script:muted -Bold
Arrow @(288, 364, 345, 364)
Arrow @(590, 364, 647, 364)
Arrow @(892, 330, 920, 330, 920, 258, 949, 258)
Arrow @(892, 425, 949, 425)
Arrow @(892, 455, 920, 455, 920, 592, 949, 592)
Arrow @(772, 480, 772, 546) '#93A8C2' -Dashed
Card 48 260 240 220 'PC / MOBILE' '브라우저' @('노트북 · 휴대폰', '닉네임 · 아바타', '브라우저에 저장')
Card 350 260 240 220 'FRONTEND' 'Next.js' @('캠퍼스 · 층별 지도', '모임 · 횃불이 UI', 'API 조회 / 갱신')
Card 652 260 240 220 'BACKEND' 'FastAPI' @('빈 강의실 계산', '모임 생성 · 참여', '추천 결과 검증') $script:blue '#EAF1FB'
Card 954 198 278 140 'TIMETABLE' '시간표 JSON' @('campus.json · 26실') $script:teal
Card 954 365 278 140 'PERSISTENT DATA' 'Firestore' @('모임 · 참여자 · 아바타') $script:teal '#E6F3EF'
Card 954 532 278 140 'LANGUAGE MODEL' 'OpenAI API' @('질문 해석 · 일반 대화') $script:purple '#F0ECF9'
RoundBox 652 552 240 120 '#FFFFFF' '#DCE5F0'
Label '서버 메모리' 674 568 23 $script:ink -Bold
Label '최근 대화 · 검색 조건' 674 608 19 $script:muted
Label '재시작 시 초기화' 674 639 18 $script:muted
EndCanvas 'architecture.png' '프론트는 FastAPI만 호출 · 비밀키는 서버에만 · Firestore 모임은 서버 재시작 후에도 유지'

# 03. AI interpretation is distinct from data validation and GPS processing.
BeginCanvas 830 '03  AI RECOMMENDATION' 'AI는 뜻을 읽고, 서버는 빈 강의실을 확인해요' '사용자의 질문을 이해한 뒤 시간표로 검증한 강의실을 추천합니다'
Arrow @(326, 262, 397, 262)
Arrow @(754, 262, 840, 262) $script:purple
Arrow @(577, 342, 577, 438) $script:teal
Arrow @(754, 536, 840, 536) $script:teal
Arrow @(187, 632, 187, 698, 1039, 698, 1039, 638) $script:orange -Dashed
Card 48 186 278 156 'INPUT' '질문 + 최근 대화' @('“7호관에서 2시간”')
Card 402 186 352 156 'INTERPRET' 'AI 의도 해석' @('이용 시간 · 원하는 층 · 현재 층') $script:purple '#F0ECF9'
Card 844 186 388 156 'CASUAL CHAT' '일상 대화' @('횃불이 말투로 짧게 답변') $script:purple
Label '검색' 594 368 18 $script:teal -Bold
Label '잡담' 779 222 18 $script:purple -Bold
RoundBox 48 370 348 44 '#ECEFF5' '' 10
Label 'AI 연결 실패 → 규칙 기반 해석' 64 380 20 $script:muted
Card 48 444 278 188 'OPTIONAL GPS' '선택한 위치' @('서버에서 거리 계산', 'OpenAI로 보내지 않음') $script:orange '#FCF0E4'
Card 402 444 352 188 'VALIDATE' '서버 시간표 검증' @('수업 + 현재·예정 모임 확인', '이용 시간 필터 · 층 우선순위') $script:teal '#E6F3EF'
Card 844 444 388 188 'RESULT' '최대 3개 추천 카드' @('강의실 · 이용 가능 시간', '위치가 있으면 도보 분 표시') $script:teal
RoundBox 442 678 320 36 '#F5F8FC' '' 8
Label '직선거리 ÷ 80m/분 · 2km 이내' 453 684 18 $script:orange
EndCanvas 'ai-flow.png' '추천 방과 시간은 서버 계산값 · GPS로 층을 추측하지 않음 · 2km 밖에서는 도보 시간 미표시'
