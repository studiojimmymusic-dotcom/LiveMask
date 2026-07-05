# Deploy Livemask backend to Railway (run from the backend/ folder).
#
# Usage:
#   cd backend
#   .\deploy-railway.ps1

$ErrorActionPreference = "Stop"
$ServiceName = "livemask-api"

function Invoke-Railway {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & npx @railway/cli @Args
    if ($LASTEXITCODE -ne 0) { throw "Railway command failed: railway $($Args -join ' ')" }
}

Write-Host ""
Write-Host "=== Livemask Railway Deploy ===" -ForegroundColor Cyan
Write-Host ""

# 1. Log in (opens browser)
Write-Host "Step 1: Log in to Railway (browser will open)..." -ForegroundColor Yellow
Invoke-Railway login

# 2. Create project if this folder is not linked yet
$linked = $false
try {
    Invoke-Railway status | Out-Null
    $linked = $true
    Write-Host "Already linked to a Railway project." -ForegroundColor DarkGray
} catch {
    $linked = $false
}

if (-not $linked) {
    Write-Host ""
    Write-Host "Step 2: Creating Railway project..." -ForegroundColor Yellow
    Invoke-Railway init -n livemask-api
}

# 3. Ensure a service exists (init creates a project only, not a service)
Write-Host ""
Write-Host "Step 3: Ensuring service '$ServiceName' exists..." -ForegroundColor Yellow
$serviceList = npx @railway/cli service list --json 2>$null
$hasService = $false
if ($serviceList) {
    try {
        $parsed = $serviceList | ConvertFrom-Json
        if ($parsed -is [array] -and $parsed.Count -gt 0) { $hasService = $true }
        elseif ($parsed) { $hasService = $true }
    } catch {
        $hasService = $false
    }
}

if (-not $hasService) {
    Write-Host "  No service found - creating '$ServiceName'..." -ForegroundColor DarkGray
    Invoke-Railway add --service $ServiceName --json
}

Invoke-Railway service link $ServiceName

# 4. Upload environment variables from .env
if (Test-Path ".env") {
    Write-Host ""
    Write-Host "Step 4: Uploading environment variables from .env..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            if ($value) {
                npx @railway/cli variables set "${name}=${value}" 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "Failed to set variable: $name" }
                Write-Host "  set $name"
            }
        }
    }
} else {
    Write-Host "WARNING: backend/.env not found. Add variables in the Railway dashboard." -ForegroundColor Red
}

# 5. Deploy
Write-Host ""
Write-Host "Step 5: Deploying..." -ForegroundColor Yellow
Invoke-Railway up --detach

# 6. Public URL
Write-Host ""
Write-Host "Step 6: Generating public URL..." -ForegroundColor Yellow
Invoke-Railway domain

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Test: open https://YOUR-URL/health  (should show {""status"":""ok""})"
Write-Host "Then update src/renderer/.env:"
Write-Host '  VITE_BACKEND_URL=https://YOUR-URL.up.railway.app'
Write-Host "Rebuild installer: npm run build:win"
Write-Host ""
