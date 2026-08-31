# Test Pranav's academic documents end-to-end with Gemini AI
$base = "http://localhost:4000/api/v1"
$docsPath = "E:\Pranav\Certificates\Academic Docs"

$email = "pranav.narkhede.test@mail.com"
$password = "PranavTest123!"

Write-Host "=== UniDiscover Profile Test ===" -ForegroundColor Cyan

# Register or login
try {
  $regBody = @{ name = 'Pranav Narkhede'; email = $email; password = $password } | ConvertTo-Json
  $auth = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType 'application/json' -Body $regBody
  Write-Host "Registered new account" -ForegroundColor Green
} catch {
  $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
  $auth = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
  Write-Host "Logged in existing account" -ForegroundColor Yellow
}

$token = $auth.data.tokens.accessToken
$headers = @{ Authorization = "Bearer $token" }

# Update profile for masters student
$profileBody = @{
  grade = 12
  classGroup = '11-12'
  stream = 'Science'
  country = 'India'
  targetDegree = 'M.Tech / MS Computer Science'
  targetCountries = @('United States', 'United Kingdom', 'India')
  onboardingStep = 6
  onboardingCompleted = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri "$base/profiles/me" -Method Put -Headers $headers -ContentType 'application/json' -Body $profileBody | Out-Null
Write-Host "Profile updated for masters pathway" -ForegroundColor Green

# Upload key documents
$files = @(
  "PranavNarkhede_Transcript.pdf",
  "10th Marksheet.pdf",
  "12th Marksheet.pdf",
  "SEM1 Marksheet.pdf",
  "SEM2 Marksheet.pdf",
  "SEM3 Marksheet .pdf",
  "SEM4 Marksheet.pdf",
  "SEM5 Marksheet.pdf",
  "SEM6 Marksheet.pdf"
)

$uploaded = 0
foreach ($file in $files) {
  $fullPath = Join-Path $docsPath $file
  if (-not (Test-Path $fullPath)) {
    Write-Host "SKIP (not found): $file" -ForegroundColor DarkYellow
    continue
  }
  Write-Host "Uploading: $file ..."
  try {
    $response = curl.exe -s -X POST "$base/profiles/me/parse-document" `
      -H "Authorization: Bearer $token" `
      -F "file=@$fullPath"
    $parsed = $response | ConvertFrom-Json
    if ($parsed.success) {
      $uploaded++
      $doc = $parsed.data
      Write-Host "  OK - $($doc.documentType) | $($doc.subjects.Count) subjects | $($doc.summary.Substring(0, [Math]::Min(80, $doc.summary.Length)))..." -ForegroundColor Green
    } else {
      Write-Host "  FAIL: $($parsed.message)" -ForegroundColor Red
    }
  } catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
  }
  Start-Sleep -Seconds 2
}

Write-Host "`nUploaded $uploaded documents" -ForegroundColor Cyan

# Build unified academic profile
Write-Host "Building unified academic profile..."
$academic = Invoke-RestMethod -Uri "$base/profiles/me/build-academic-profile" -Method Post -Headers $headers
Write-Host "AI Summary: $($academic.data.aiSummary)" -ForegroundColor Magenta
Write-Host "Program: $($academic.data.program) | CGPA: $($academic.data.cgpa)" -ForegroundColor Magenta
Write-Host "Interests: $($academic.data.inferredInterests -join ', ')" -ForegroundColor Magenta

# Complete diagnostic quickly
$session = Invoke-RestMethod -Uri "$base/diagnostics/sessions/start" -Method Post -Headers $headers
Invoke-RestMethod -Uri "$base/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"vibe","answer":"build"}' | Out-Null
Invoke-RestMethod -Uri "$base/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"subjects","answer":"cs"}' | Out-Null
Invoke-RestMethod -Uri "$base/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"confidence","answer":8}' | Out-Null
Invoke-RestMethod -Uri "$base/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"dream","answer":"AI and software engineering for global tech"}' | Out-Null
$report = Invoke-RestMethod -Uri "$base/diagnostics/sessions/$($session.data.id)/complete" -Method Post -Headers $headers
Write-Host "`nDiagnostic: $($report.data.headline)" -ForegroundColor Cyan

# Career map
$map = Invoke-RestMethod -Uri "$base/career-map/generate" -Method Post -Headers $headers
Write-Host "Career Map: $($map.data.mapData.headline)" -ForegroundColor Cyan

# Recommendations
$colleges = Invoke-RestMethod -Uri "$base/colleges/recommend" -Method Post -Headers $headers
Write-Host "`nTop Colleges:" -ForegroundColor Cyan
$colleges.data | ForEach-Object {
  $score = [math]::Round($_.score)
  $rat = $_.rationale
  if ($rat.Length -gt 100) { $rat = $rat.Substring(0, 100) }
  Write-Host "  - $($_.college.name) score $score - $rat"
}

$careers = Invoke-RestMethod -Uri "$base/careers/recommend" -Method Post -Headers $headers
Write-Host ""
Write-Host "Top Careers:" -ForegroundColor Cyan
$careers.data | ForEach-Object {
  $score = [math]::Round($_.score)
  Write-Host "  - $($_.career.title) score $score"
}

$paths = Invoke-RestMethod -Uri "$base/careers/paths/generate" -Method Post -Headers $headers
Write-Host "`nCareer Paths:" -ForegroundColor Cyan
$paths.data.paths | ForEach-Object { Write-Host "  - $($_.title): $($_.careers -join ' + ')" }

$essay = Invoke-RestMethod -Uri "$base/applications/documents/generate" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"type":"PERSONAL_STATEMENT"}'
Write-Host "`nPersonal Statement (first 200 chars):" -ForegroundColor Cyan
Write-Host $essay.data.content.Substring(0, [Math]::Min(200, $essay.data.content.Length))

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Green
Write-Host "Login: $email / $password" -ForegroundColor Yellow
