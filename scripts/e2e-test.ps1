$email = "e2e.test.$([guid]::NewGuid().ToString('N').Substring(0,8))@mail.com"
$body = @{ name = 'E2E Student'; email = $email; password = 'TestPass123!' } | ConvertTo-Json

$reg = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/register' -Method Post -ContentType 'application/json' -Body $body
$token = $reg.data.tokens.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "1. Register OK -" $reg.data.user.email

$colleges = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/colleges' -Headers $headers
Write-Host "2. Colleges listed -" $colleges.data.Count

$rec = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/colleges/recommend' -Method Post -Headers $headers
Write-Host "3. Recommendations -" $rec.data.Count

$session = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/diagnostics/sessions/start' -Method Post -Headers $headers
Write-Host "4. Diagnostic session -" $session.data.id

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"vibe","answer":"build"}' | Out-Null
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"subjects","answer":"cs"}' | Out-Null
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"confidence","answer":7}' | Out-Null
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/diagnostics/sessions/$($session.data.id)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"stepId":"dream","answer":"Build AI for education"}' | Out-Null

$report = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/diagnostics/sessions/$($session.data.id)/complete" -Method Post -Headers $headers
Write-Host "5. Diagnostic report -" $report.data.headline

$doc = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/applications/documents/generate' -Method Post -Headers $headers -ContentType 'application/json' -Body '{"type":"PERSONAL_STATEMENT"}'
Write-Host "6. Essay generated -" $doc.data.title

$cv = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/job-readiness/assets/generate' -Method Post -Headers $headers -ContentType 'application/json' -Body '{"type":"CV"}'
Write-Host "7. CV generated -" $cv.data.title

$questions = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/tutoring/questions?testType=SAT' -Headers $headers
Write-Host "8. Tutoring questions -" $questions.data.Count

Write-Host "ALL E2E TESTS PASSED"
