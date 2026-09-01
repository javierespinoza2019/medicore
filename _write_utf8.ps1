param([string],[string]) 
=New-Object System.Text.UTF8Encoding False 
=(Get-Content -LiteralPath  -Raw).Trim() 
=[Convert]::FromBase64String() 
=[System.Text.Encoding]::UTF8.GetString() 
[System.IO.File]::WriteAllText(,,) 
=[System.IO.File]::ReadAllBytes() 
=(.Length -ge 3 -and [0]-eq 0xEF -and [1]-eq 0xBB -and [2]-eq 0xBF) 
Write-Output ('wrote {0} bom={1}' -f .Length,) 
