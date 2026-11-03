$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
if (-not $desktop) {
    $desktop = Join-Path $env:USERPROFILE 'Desktop'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot 'CHAY_SOCIALFLOW.bat'
$shortcutPath = Join-Path $desktop 'SocialFlow.lnk'

try {
    $s = $ws.CreateShortcut($shortcutPath)
    $s.TargetPath = $target
    $s.WorkingDirectory = $projectRoot
    $s.Description = 'SocialFlow - Auto Reup Social Media Manager'
    $s.Save()
    Write-Host "[THANH CONG] Da tao loi tat 'SocialFlow' tai: $shortcutPath"
} catch {
    Write-Host "[HUONG DAN] Khong the ghi truc tiep vao Desktop: $($_.Exception.Message)"
}
