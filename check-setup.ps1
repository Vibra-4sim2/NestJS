# Script de vérification de l'installation du système de recommandations
# Usage: .\check-setup.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Vérification du système de recommandations" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allChecks = @()

# 1. Vérifier Python
Write-Host "1. Vérification de Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Python installé: $pythonVersion" -ForegroundColor Green
        $allChecks += $true
    } else {
        Write-Host "   ✗ Python non trouvé" -ForegroundColor Red
        Write-Host "     Installez Python depuis https://www.python.org/" -ForegroundColor Yellow
        $allChecks += $false
    }
} catch {
    Write-Host "   ✗ Python non trouvé" -ForegroundColor Red
    $allChecks += $false
}
Write-Host ""

# 2. Vérifier les packages Python
Write-Host "2. Vérification des packages Python..." -ForegroundColor Yellow
$packages = @("pandas", "numpy", "joblib", "dateutil", "sklearn")
$missingPackages = @()

foreach ($package in $packages) {
    try {
        $result = python -c "import $package; print('OK')" 2>&1
        if ($result -match "OK") {
            Write-Host "   ✓ $package installé" -ForegroundColor Green
        } else {
            Write-Host "   ✗ $package manquant" -ForegroundColor Red
            $missingPackages += $package
        }
    } catch {
        Write-Host "   ✗ $package manquant" -ForegroundColor Red
        $missingPackages += $package
    }
}

if ($missingPackages.Count -eq 0) {
    Write-Host "   ✓ Tous les packages Python sont installés" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host "   ✗ Packages manquants: $($missingPackages -join ', ')" -ForegroundColor Red
    Write-Host "     Installez avec: pip install pandas numpy joblib python-dateutil scikit-learn" -ForegroundColor Yellow
    $allChecks += $false
}
Write-Host ""

# 3. Vérifier les scripts Python
Write-Host "3. Vérification des scripts Python..." -ForegroundColor Yellow
$scripts = @(
    "src\ai\recommendation_runner.py",
    "src\ai\prep_preferences.py",
    "src\ai\prep_sorties.py"
)

$allScriptsPresent = $true
foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "   ✓ $script présent" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $script manquant" -ForegroundColor Red
        $allScriptsPresent = $false
    }
}

if ($allScriptsPresent) {
    $allChecks += $true
} else {
    $allChecks += $false
}
Write-Host ""

# 4. Vérifier le dossier models
Write-Host "4. Vérification des modèles ML..." -ForegroundColor Yellow
if (Test-Path "src\ai\models") {
    Write-Host "   ✓ Dossier models/ présent" -ForegroundColor Green
    
    $modelFiles = @(
        "preferences_scaler.joblib",
        "preferences_kmeans.joblib",
        "preferences_features.joblib",
        "sorties_scaler.joblib",
        "sorties_kmeans.joblib",
        "sorties_features.joblib"
    )
    
    $allModelsPresent = $true
    foreach ($model in $modelFiles) {
        $modelPath = "src\ai\models\$model"
        if (Test-Path $modelPath) {
            Write-Host "   ✓ $model présent" -ForegroundColor Green
        } else {
            Write-Host "   ✗ $model manquant" -ForegroundColor Red
            $allModelsPresent = $false
        }
    }
    
    if ($allModelsPresent) {
        $allChecks += $true
    } else {
        Write-Host "     Placez vos fichiers .joblib dans src\ai\models\" -ForegroundColor Yellow
        $allChecks += $false
    }
} else {
    Write-Host "   ✗ Dossier models/ manquant" -ForegroundColor Red
    Write-Host "     Créez-le avec: mkdir src\ai\models" -ForegroundColor Yellow
    $allChecks += $false
}
Write-Host ""

# 5. Vérifier les fichiers NestJS
Write-Host "5. Vérification des fichiers NestJS..." -ForegroundColor Yellow
$nestFiles = @(
    "src\recommendations\recommendations.module.ts",
    "src\recommendations\recommendations.controller.ts",
    "src\recommendations\recommendations.service.ts",
    "src\recommendations\python-ml.service.ts"
)

$allNestFilesPresent = $true
foreach ($file in $nestFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file présent" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file manquant" -ForegroundColor Red
        $allNestFilesPresent = $false
    }
}

if ($allNestFilesPresent) {
    $allChecks += $true
} else {
    $allChecks += $false
}
Write-Host ""

# 6. Vérifier app.module.ts
Write-Host "6. Vérification de l'intégration dans app.module.ts..." -ForegroundColor Yellow
if (Test-Path "src\app.module.ts") {
    $appModuleContent = Get-Content "src\app.module.ts" -Raw
    if ($appModuleContent -match "RecommendationsModule") {
        Write-Host "   ✓ RecommendationsModule importé dans app.module.ts" -ForegroundColor Green
        $allChecks += $true
    } else {
        Write-Host "   ✗ RecommendationsModule non importé dans app.module.ts" -ForegroundColor Red
        Write-Host "     Ajoutez: import { RecommendationsModule } from './recommendations/recommendations.module';" -ForegroundColor Yellow
        $allChecks += $false
    }
} else {
    Write-Host "   ✗ app.module.ts non trouvé" -ForegroundColor Red
    $allChecks += $false
}
Write-Host ""

# Résumé
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "RÉSUMÉ" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$successCount = ($allChecks | Where-Object { $_ -eq $true }).Count
$totalCount = $allChecks.Count

Write-Host "Vérifications réussies: $successCount/$totalCount" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($successCount -eq $totalCount) {
    Write-Host ""
    Write-Host "✨ Tout est prêt ! Vous pouvez tester le système:" -ForegroundColor Green
    Write-Host "   1. node test-recommendations.js" -ForegroundColor Cyan
    Write-Host "   2. npm run start:dev" -ForegroundColor Cyan
    Write-Host "   3. curl http://localhost:3000/recommendations/health/check" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⚠️  Veuillez corriger les problèmes ci-dessus avant de continuer." -ForegroundColor Yellow
    Write-Host "   Consultez RECOMMENDATIONS_QUICKSTART.md pour plus d'aide." -ForegroundColor Cyan
}
Write-Host ""
